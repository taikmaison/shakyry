// Маленький SMTP-клиент на встроенных net/tls — без сторонних библиотек.
// Порт 465 (или SMTP_SECURE=1) — сразу TLS; иначе STARTTLS, если сервер его предлагает
// (на 587 — обязательно). Вход — AUTH PLAIN или AUTH LOGIN. Письмо — text/plain в UTF-8:
// тема кодируется как =?UTF-8?B?…?=, тело — base64.
const net = require('net');
const tls = require('tls');
const os = require('os');
const crypto = require('crypto');
const { StringDecoder } = require('string_decoder');

const b64 = s => Buffer.from(s, 'utf8').toString('base64');
const isLocal = host => /^(localhost|127\.\d+\.\d+\.\d+|::1)$/i.test(host);

// заголовок с не-ASCII символами → набор encoded-word не длиннее 75 символов каждый
function encodeHeader(text) {
  const s = String(text).replace(/[\r\n]+/g, ' ');
  if (/^[\x20-\x7e]*$/.test(s)) return s;
  const words = [];
  let chunk = '';
  for (const ch of s) {
    if (Buffer.byteLength(chunk + ch) > 45) { words.push(chunk); chunk = ''; }
    chunk += ch;
  }
  if (chunk) words.push(chunk);
  return words.map(w => `=?UTF-8?B?${b64(w)}?=`).join('\r\n ');
}

// "Имя <addr@host>" или "addr@host" → { address, header }
function parseFrom(from) {
  const m = String(from).match(/^\s*(?:"?([^"<]*?)"?\s*)?<([^<>\s]+@[^<>\s]+)>\s*$/);
  if (m) return { address: m[2], header: m[1] ? `${encodeHeader(m[1])} <${m[2]}>` : `<${m[2]}>` };
  const address = String(from).trim();
  return { address, header: address };
}

// соединение: читает ответы сервера (многострочные 250-…/250 …) и отдаёт их по одному
class Connection {
  constructor(socket, timeout) {
    this.timeout = timeout;
    this.replies = [];
    this.waiters = [];
    this.lines = [];
    this.buf = '';
    this.error = null;
    this.done = false;
    this.onData = chunk => this.receive(this.decoder.write(chunk));
    this.onError = e => this.fail(e);
    this.onClose = () => this.fail(new Error('сервер закрыл соединение'));
    this.onTimeout = () => this.fail(new Error('нет ответа от сервера'));
    this.use(socket);
  }
  use(socket) {
    this.socket = socket;
    this.decoder = new StringDecoder('utf8');
    socket.setTimeout(this.timeout, this.onTimeout);
    socket.on('data', this.onData);
    socket.on('error', this.onError);
    socket.on('close', this.onClose);
  }
  // STARTTLS: старый сокет отдаём TLS, сами слушаем уже зашифрованный
  upgrade(host) {
    const plain = this.socket;
    plain.removeListener('data', this.onData);
    plain.setTimeout(0);
    this.use(tls.connect({ socket: plain, host, servername: net.isIP(host) ? undefined : host }));
  }
  receive(text) {
    this.buf += text;
    let i;
    while ((i = this.buf.indexOf('\n')) >= 0) {
      const line = this.buf.slice(0, i).replace(/\r$/, '');
      this.buf = this.buf.slice(i + 1);
      this.lines.push(line);
      if (/^\d{3}(?: |$)/.test(line)) {
        const reply = { code: Number(line.slice(0, 3)), lines: this.lines.map(l => l.slice(4)), text: this.lines.join(' | ') };
        this.lines = [];
        const w = this.waiters.shift();
        if (w) w.resolve(reply); else this.replies.push(reply);
      }
    }
  }
  read() {
    if (this.replies.length) return Promise.resolve(this.replies.shift());
    if (this.error) return Promise.reject(this.error);
    return new Promise((resolve, reject) => this.waiters.push({ resolve, reject }));
  }
  fail(e) {
    if (this.done || this.error) return;
    this.error = e;
    for (const w of this.waiters.splice(0)) w.reject(e);
    this.socket.destroy();
  }
  // команда и ожидаемые коды ответа; label — что показать в ошибке вместо секретов
  async cmd(line, expect, label = line) {
    this.socket.write(line + '\r\n');
    const r = await this.read();
    if (!expect.includes(r.code)) throw new Error(`${label} → ${r.text}`);
    return r;
  }
  close() {
    this.done = true;
    this.socket.end();
    setTimeout(() => this.socket.destroy(), 1000).unref();
  }
}

const capabilities = reply => reply.lines.slice(1).map(l => l.toUpperCase());

// письмо целиком (заголовки + тело base64), с «удвоением» точек в начале строк
function buildMessage({ from, to, subject, text }) {
  const domain = (from.address.split('@')[1] || 'localhost').replace(/[^\w.-]/g, '');
  const body = (b64(String(text).replace(/\r?\n/g, '\r\n')).match(/.{1,76}/g) || []).join('\r\n');
  const head = [
    `From: ${from.header}`,
    `To: <${to}>`,
    `Subject: ${encodeHeader(subject)}`,
    `Date: ${new Date().toUTCString().replace('GMT', '+0000')}`,
    `Message-ID: <${crypto.randomBytes(12).toString('hex')}@${domain}>`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
  ].join('\r\n');
  return (head + '\r\n\r\n' + body).replace(/^\./gm, '..');
}

// config: { host, port, secure, user, pass, from }; mail: { to, subject, text }
async function sendMail(config, { to, subject, text }, { timeout = 20000 } = {}) {
  const host = config.host, port = Number(config.port) || 587;
  const secure = config.secure != null ? !!config.secure : port === 465;
  if (/[\r\n<>]/.test(to)) throw new Error('некорректный адрес получателя');
  const from = parseFrom(config.from);

  const socket = secure
    ? tls.connect({ host, port, servername: net.isIP(host) ? undefined : host })
    : net.connect({ host, port });
  const c = new Connection(socket, timeout);
  try {
    const hello = await c.read();
    if (hello.code !== 220) throw new Error(`приветствие сервера → ${hello.text}`);
    const name = (os.hostname() || 'localhost').replace(/[^\w.-]/g, '') || 'localhost';
    let caps = capabilities(await c.cmd(`EHLO ${name}`, [250]));
    let encrypted = secure;

    if (!encrypted && caps.includes('STARTTLS')) {
      await c.cmd('STARTTLS', [220]);
      c.upgrade(host);
      caps = capabilities(await c.cmd(`EHLO ${name}`, [250]));
      encrypted = true;
    }
    if (!encrypted && port === 587) throw new Error('сервер на порту 587 не предлагает STARTTLS');

    if (config.user) {
      // пароль открытым текстом отправляем только на локальный сервер (для разработки)
      if (!encrypted && !isLocal(host)) throw new Error('сервер не поддерживает шифрование — вход по паролю без TLS запрещён');
      const auth = (caps.find(l => l.startsWith('AUTH')) || '').split(/[\s=]+/);
      if (auth.includes('PLAIN') || !auth.includes('LOGIN')) {
        await c.cmd(`AUTH PLAIN ${b64(`\0${config.user}\0${config.pass || ''}`)}`, [235], 'AUTH PLAIN');
      } else {
        await c.cmd('AUTH LOGIN', [334]);
        await c.cmd(b64(config.user), [334], 'AUTH LOGIN (логин)');
        await c.cmd(b64(config.pass || ''), [235], 'AUTH LOGIN (пароль)');
      }
    }

    await c.cmd(`MAIL FROM:<${from.address}>`, [250]);
    await c.cmd(`RCPT TO:<${to}>`, [250, 251]);
    await c.cmd('DATA', [354]);
    await c.cmd(buildMessage({ from, to, subject, text }) + '\r\n.', [250], 'текст письма');
    await c.cmd('QUIT', [221]).catch(() => {});
  } catch (e) {
    throw new Error(`SMTP ${host}:${port}: ${e.message}`);
  } finally {
    c.close();
  }
}

module.exports = { sendMail, encodeHeader };
