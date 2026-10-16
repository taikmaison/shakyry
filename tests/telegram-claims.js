// Проверка «кода для клиента» через бота с поддельным Telegram Bot API (без настоящего Telegram).
// 1) Поддельный Telegram — этот же скрипт (порт TG_PORT, по умолчанию 8399). 2) Тестовый сайт с ботом, смотрящим в него:
//   AUTH__TELEGRAM_BOT_TOKEN=test AUTH__TELEGRAM_API_URL=http://127.0.0.1:8399 AUTH__DEV_LOGIN_CODES=1 AUTH__DB_FILE=<тест>/auth.db ... node run.js --offset=100
//   BASE=http://127.0.0.1:8124 AUTH_DB=<тест>/auth.db node tests/telegram-claims.js
// Скрипт сначала поднимает поддельный Telegram и ждёт, пока бот к нему подключится (getMe/getUpdates).
const http = require('http');
const path = require('path');
const { execFileSync } = require('child_process');

const B = process.env.BASE || 'http://127.0.0.1:8124';
const TG_PORT = Number(process.env.TG_PORT || 8399);
let failed = 0;
const ok = (cond, msg) => { console.log(`${cond ? '✓' : '✗'} ${msg}`); if (!cond) failed++; };
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---------- поддельный Telegram Bot API ----------
const queue = [], sent = [];
let updateId = 1, polled = false;
http.createServer((req, res) => {
  let body = '';
  req.on('data', c => { body += c; });
  req.on('end', async () => {
    const method = req.url.split('/').pop();
    const p = body ? JSON.parse(body) : {};
    const reply = result => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ ok: true, result })); };
    if (method === 'getMe') return reply({ id: 1, is_bot: true, first_name: 'Test', username: 'test_bot' });
    if (method === 'sendMessage') { sent.push({ chat: p.chat_id, text: p.text }); return reply({ message_id: sent.length }); }
    if (method === 'getUpdates') {
      polled = true;
      for (let i = 0; i < 20 && !queue.length; i++) await sleep(100);
      return reply(queue.splice(0).filter(u => u.update_id >= (p.offset || 0)));
    }
    reply(true);   // deleteWebhook, getWebhookInfo и прочее
  });
}).listen(TG_PORT, '127.0.0.1');
const fromTg = (id, text, extra = {}) => queue.push({ update_id: updateId++, message: { message_id: updateId, date: 0, text, chat: { id, type: 'private' }, from: { id, is_bot: false, first_name: extra.name || 'Клиент', username: extra.username } } });
const waitSent = async (chat, re, ms = 8000) => {
  for (let t = 0; t < ms; t += 100) { const m = sent.find(s => s.chat === chat && re.test(s.text)); if (m) return m; await sleep(100); }
  return null;
};

function client() {
  let sid = '';
  const req = async (p, opts = {}) => {
    const r = await fetch(B + p, { ...opts, headers: { ...(opts.headers || {}), ...(sid ? { cookie: 'sid=' + sid } : {}) } });
    const m = (r.headers.get('set-cookie') || '').match(/sid=([^;]*)/); if (m) sid = m[1];
    return { status: r.status, body: await r.json().catch(() => null) };
  };
  const post = (p, d) => req(p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d || {}) });
  return { req, post };
}

(async () => {
  for (let i = 0; i < 600 && !polled; i++) await sleep(100);
  ok(polled, 'бот подключился к поддельному Telegram');
  const run = Date.now().toString(36);
  const admin = client(), guest = client();
  const email = `admin-${run}@example.com`;
  const s = await admin.post('/api/auth/email/start', { email });
  await admin.post('/api/auth/email/verify', { email, code: s.body.dev_code, name: 'Админ' });
  execFileSync(process.execPath, ['--disable-warning=ExperimentalWarning', 'tools/make-admin.js', email, '--replace'],
    { cwd: path.join(__dirname, '..', 'services', 'auth'), env: { ...process.env, DB_FILE: process.env.AUTH_DB }, stdio: 'ignore' });
  await sleep(300);

  // админ делает приглашение «для клиента» и публикует
  const tid = (await guest.req('/api/templates')).body[0].id;
  const inv = (await admin.post('/api/invitations', { template_id: tid, title: 'Тест тойы', name1: 'Айбек', name2: 'Аружан', date: '2027-06-12', force: true })).body;
  await admin.post(`/api/invitations/${inv.id}/submit`, { agree: true });
  ok((await admin.post(`/api/admin/invitations/${inv.id}/approve`)).body.status === 'published', 'приглашение опубликовано админом');

  ok((await guest.post(`/api/admin/invitations/${inv.id}/claim`)).status === 401, 'код выдаёт только админ');
  const c1 = (await admin.post(`/api/admin/invitations/${inv.id}/claim`)).body;
  const c2 = (await admin.post(`/api/admin/invitations/${inv.id}/claim`)).body;
  ok(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(c2.code) && c2.link === `https://t.me/test_bot?start=c_${c2.code.replace('-', '')}`, `код ${c2.code} и ссылка на бота`);

  // прежний код не действует, неверный — тоже
  fromTg(501, c1.code);
  ok(!!await waitSent(501, /Код не найден/), 'прежний код отменён новым');
  fromTg(501, 'ZZZZ-ZZZZ');
  ok(!!await waitSent(501, /Код не найден/), 'неверный код — отказ');

  // клиент открывает ссылку (/start c_…)
  fromTg(777, `/start c_${c2.code.replace('-', '')}`, { name: 'Айнұр', username: 'ainur_test' });
  ok(!!await waitSent(777, /Дайын! «Тест тойы/), 'бот: приглашение теперь ваше');
  fromTg(888, c2.code.toLowerCase().replace('-', ' '), { name: 'Чужой' });
  ok(!!await waitSent(888, /пайдаланып қойған/), 'тот же код другому — отказ');

  // владелец меняется (сервис приглашений забирает отметку сам)
  await sleep(5200);
  const list = (await admin.req(`/api/admin/invitations?q=${inv.id}`)).body.invitations;
  const users = (await admin.req('/api/admin/users?q=ainur_test')).body.users;
  ok(users.length === 1 && list[0].user_id === users[0].id, 'приглашение перешло клиенту (новый пользователь из Telegram)');

  // ответы и пожелания гостей — клиенту в Telegram
  await guest.post(`/api/i/${inv.id}/rsvp`, { form_id: 'f-1', guest_key: 'guest-cccccccc', action_text: 'Иә, келемін', fields: { name: 'Гость А' } });
  ok(!!await waitSent(777, /Гость А — Придёт/), 'ответ гостя пришёл клиенту');
  await guest.post(`/api/i/${inv.id}/wishes`, { name: 'Гость Б', message: 'Бақытты болыңдар!' });
  ok(!!await waitSent(777, /💌 Гость Б: Бақытты болыңдар!/), 'пожелание пришло клиенту');

  console.log(failed ? `\nОшибок: ${failed}` : '\nВсё работает.');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
