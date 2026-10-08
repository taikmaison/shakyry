// Сервис авторизации: пользователи, вход без пароля (код на почту или подтверждение в Telegram-боте), роли.
// Ни от кого не зависит. Другие сервисы узнают пользователя, пересылая сюда его cookie sid
// (или Authorization: Bearer <sid>) в GET /api/auth/me. Уведомления — POST /_internal/notify*.
//
// Сессия — случайный токен (32 байта, base64url) в cookie sid; в базе только его sha256.
// Коды из писем и токены входа через Telegram тоже хранятся только хешами.
// Администратор — ровно один, назначается только командой на сервере: node tools/make-admin.js.
const crypto = require('crypto');
const { env, json, readJson, bearer, HttpError, createService } = require('../lib/http');
const { openStore, normalizeEmail, cleanName, nameLength, clipName, userView, searchText } = require('./store');
const { sendMail } = require('./smtp');
const { createBot } = require('./telegram');

const flag = name => /^(1|true|yes|on)$/i.test(env(name, ''));

const MIN = 60e3, HOUR = 60 * MIN, DAY = 24 * HOUR;
const SESSION_TTL = 30 * DAY;    // срок сессии
const RENEW_BEFORE = 15 * DAY;   // продлеваем при использовании, если осталось меньше
const CODE_TTL = 10 * MIN;       // код из письма
const CODE_ATTEMPTS = 5;         // неверных попыток до сгорания кода
const TG_TTL = 10 * MIN;         // ссылка входа через Telegram

const COOKIE_SECURE = flag('COOKIE_SECURE');
const DEV_CODES = flag('DEV_LOGIN_CODES');
const SMTP = {
  host: env('SMTP_HOST', ''),
  port: Number(env('SMTP_PORT', 587)),
  secure: env('SMTP_SECURE') == null ? undefined : flag('SMTP_SECURE'),
  user: env('SMTP_USER', ''),
  pass: env('SMTP_PASS', ''),
  from: env('SMTP_FROM', '') || (env('SMTP_USER', '').includes('@') ? env('SMTP_USER') : ''),
};
const SMTP_ON = !!(SMTP.host && SMTP.from);

const db = openStore();
const bot = env('TELEGRAM_BOT_TOKEN')
  ? createBot({ token: env('TELEGRAM_BOT_TOKEN'), apiUrl: env('TELEGRAM_API_URL', 'https://api.telegram.org'), onUpdate: handleUpdate })
  : null;

const sha = s => crypto.createHash('sha256').update(String(s)).digest('hex');
const same = (a, b) => typeof a === 'string' && typeof b === 'string' && a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
const nowIso = () => new Date().toISOString();

// ---------- тексты (kz + ru) ----------
const TEXT = {
  mailSubject: code => `Кіру коды / Код для входа: ${code}`,
  mailBody: code => [
    `Кіру коды: ${code}. 10 минут ішінде жарамды.`,
    `Код для входа: ${code}. Действует 10 минут.`,
    '',
    'Егер кодты сіз сұрамасаңыз, бұл хатты елемеңіз.',
    'Если вы не запрашивали код, просто не обращайте внимания на это письмо.',
  ].join('\n'),
  notifySubject: 'Хабарландыру / Уведомление',
  tgHello: 'Сәлеметсіз бе! Бұл бот сайтқа кіруге көмектеседі: сайтта «Telegram арқылы кіру» батырмасын басыңыз.\n\n'
    + 'Здравствуйте! Этот бот помогает войти на сайт: нажмите на сайте «Войти через Telegram».',
  tgConfirmed: 'Кіру расталды — сайтқа оралыңыз.\nВход подтверждён — вернитесь на сайт.',
  tgExpired: 'Кіру сілтемесінің мерзімі өтіп кетті — сайтта қайтадан бастаңыз.\nСсылка для входа устарела — начните вход на сайте заново.',
  tgUsed: 'Бұл сілтеме басқа аккаунтпен пайдаланылған.\nЭта ссылка уже использована другим аккаунтом.',
  tgBlocked: 'Аккаунт бұғатталған.\nАккаунт заблокирован.',
};

// ---------- запрос ----------
async function readBody(req) {
  const body = await readJson(req);
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, 'Ожидается JSON-объект');
  return body;
}
// IP клиента: шлюз кладёт его в x-forwarded-for; без шлюза — адрес сокета
function clientIp(req) {
  const fwd = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return (fwd || req.socket.remoteAddress || '').replace(/^::ffff:/, '').slice(0, 64);
}
function requiredName(v) {
  const name = cleanName(v);
  if (!name) throw new HttpError(400, 'Укажите имя');
  if (nameLength(name) > 60) throw new HttpError(400, 'Имя слишком длинное — не больше 60 символов');
  return name;
}

// ---------- ограничение частоты ----------
const hit = (bucket, key) => db.run('INSERT INTO hits (bucket, key, at) VALUES (?, ?, ?)', bucket, key, Date.now());
const humanWait = s => (s < 60 ? `${s} с` : `${Math.ceil(s / 60)} мин`);
// не больше max событий за windowMs, иначе 429 с Retry-After
function limit(res, bucket, key, max, windowMs, message) {
  const since = Date.now() - windowMs;
  const { n } = db.get('SELECT COUNT(*) AS n FROM hits WHERE bucket = ? AND key = ? AND at > ?', bucket, key, since);
  if (n < max) return;
  // снова можно, когда из окна выйдет лишнее событие
  const { at } = db.get('SELECT at FROM hits WHERE bucket = ? AND key = ? AND at > ? ORDER BY at LIMIT 1 OFFSET ?', bucket, key, since, n - max);
  const wait = Math.max(1, Math.ceil((at + windowMs - Date.now()) / 1000));
  res.setHeader('Retry-After', String(wait));
  throw new HttpError(429, `${message} Повторите через ${humanWait(wait)}.`);
}

// ---------- пользователи ----------
const getUser = id => db.get('SELECT * FROM users WHERE id = ?', id);
function createUser(fields) {
  const u = { email: null, telegram_id: null, telegram_username: null, ...fields };
  const now = nowIso();
  return db.get(`INSERT INTO users (email, telegram_id, telegram_username, name, search, role, blocked, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, 'user', 0, ?, ?) RETURNING *`,
  u.email, u.telegram_id, u.telegram_username, u.name, searchText(u), now, now);
}
const adminView = u => u && { ...userView(u), blocked: !!u.blocked };

// ---------- сессии ----------
function setSid(res, value, maxAge) {
  res.setHeader('Set-Cookie', `sid=${value}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${COOKIE_SECURE ? '; Secure' : ''}`);
}
function startSession(res, user) {
  if (user.blocked) throw new HttpError(403, 'Аккаунт заблокирован');
  const token = crypto.randomBytes(32).toString('base64url');
  db.run('INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)', sha(token), user.id, nowIso(), Date.now() + SESSION_TTL);
  setSid(res, token, SESSION_TTL / 1000);
  return user;
}
// токены запроса: сначала cookie sid (их может быть несколько), затем Authorization: Bearer
function tokensOf(req) {
  const out = [];
  for (const part of String(req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === 'sid') out.push({ token: part.slice(i + 1).trim(), cookie: true });
  }
  const b = bearer(req);
  if (b) out.push({ token: b, cookie: false });
  return out.filter(t => /^[A-Za-z0-9_-]{20,128}$/.test(t.token));
}
// текущая сессия или null; продлевает срок, если осталось меньше 15 дней
function currentSession(req) {
  const now = Date.now();
  for (const t of tokensOf(req)) {
    const hash = sha(t.token);
    const s = db.get('SELECT * FROM sessions WHERE token_hash = ?', hash);
    if (!s) continue;
    const user = getUser(s.user_id);
    if (s.expires_at <= now || !user || user.blocked) { db.run('DELETE FROM sessions WHERE token_hash = ?', hash); continue; }
    let expires = s.expires_at, renewed = false;
    if (expires - now < RENEW_BEFORE) {
      expires = now + SESSION_TTL;
      renewed = true;
      db.run('UPDATE sessions SET expires_at = ? WHERE token_hash = ?', expires, hash);
    }
    return { ...t, hash, user, expires, renewed };
  }
  return null;
}
function requireUser(req) {
  const s = currentSession(req);
  if (!s) throw new HttpError(401, 'Нужно войти');
  return s;
}
function requireAdmin(req) {
  const s = requireUser(req);
  if (s.user.role !== 'admin') throw new HttpError(403, 'Доступно только администратору');
  return s;
}

// ---------- доставка сообщений ----------
// Telegram, если привязан и бот работает; иначе письмо, если есть почта и SMTP. → 'telegram' | 'email' | null
async function deliver(user, text, subject) {
  if (user.blocked) return null;
  if (user.telegram_id && bot && bot.ready) {
    try { await bot.send(user.telegram_id, text); return 'telegram'; }
    catch (e) { console.warn(`[auth] Telegram-сообщение пользователю ${user.id} не доставлено: ${e.message}`); }
  }
  if (user.email && SMTP_ON) {
    try { await sendMail(SMTP, { to: user.email, subject, text }); return 'email'; }
    catch (e) { console.warn(`[auth] письмо пользователю ${user.id} не доставлено: ${e.message}`); }
  }
  return null;
}
async function readNotice(req) {
  const body = await readBody(req);
  const text = typeof body.text === 'string' ? body.text.trim().slice(0, 4000) : '';
  if (!text) throw new HttpError(400, 'Укажите текст уведомления');
  const subject = typeof body.subject === 'string' && body.subject.trim() ? body.subject.replace(/\s+/g, ' ').trim().slice(0, 150) : TEXT.notifySubject;
  return { body, text, subject };
}

// ---------- Telegram: обработка сообщений боту ----------
// /start <токен> — подтвердить вход; /start без токена — приветствие; остальное не трогаем
async function handleUpdate(update) {
  const m = update && update.message;
  if (!m || !m.from || !m.chat || typeof m.text !== 'string') return;
  const cmd = /^\/start(?:@\w+)?(?:\s+(\S+))?\s*$/.exec(m.text.trim());
  if (!cmd) return;
  const reply = text => bot.send(m.chat.id, text).catch(e => console.warn(`[auth] Telegram: ответ не отправлен: ${e.message}`));
  if (!cmd[1]) return reply(TEXT.tgHello);
  const hash = sha(cmd[1]);
  const row = db.get('SELECT * FROM telegram_logins WHERE token_hash = ?', hash);
  if (!row || row.expires_at <= Date.now()) return reply(TEXT.tgExpired);
  if (row.confirmed_at && row.telegram_id !== m.from.id) return reply(TEXT.tgUsed);
  db.run('UPDATE telegram_logins SET telegram_id = ?, first_name = ?, last_name = ?, username = ?, confirmed_at = ? WHERE token_hash = ?',
    m.from.id, m.from.first_name || null, m.from.last_name || null, m.from.username || null, Date.now(), hash);
  const known = db.get('SELECT blocked FROM users WHERE telegram_id = ?', m.from.id);
  return reply(known && known.blocked ? TEXT.tgBlocked : TEXT.tgConfirmed);
}
// пользователь по подтверждённому входу: находим по telegram_id или создаём; ник обновляем
function telegramUser(row) {
  const username = row.username || null;
  const u = db.get('SELECT * FROM users WHERE telegram_id = ?', row.telegram_id);
  if (!u) {
    const name = clipName(cleanName([row.first_name, row.last_name].filter(Boolean).join(' '))) || clipName(username || '') || 'Telegram';
    return createUser({ telegram_id: row.telegram_id, telegram_username: username, name });
  }
  if (u.telegram_username === username) return u;
  const next = { ...u, telegram_username: username };
  db.run('UPDATE users SET telegram_username = ?, search = ?, updated_at = ? WHERE id = ?', username, searchText(next), nowIso(), u.id);
  return next;
}
async function botName() {
  if (!bot || bot.disabled) throw new HttpError(503, 'Вход через Telegram не настроен');
  if (!bot.username) await bot.whoami().catch(() => { throw new HttpError(503, 'Telegram сейчас недоступен — попробуйте позже'); });
  return bot.username;
}

// ---------- уборка просроченного ----------
function sweep() {
  const now = Date.now();
  db.run('DELETE FROM sessions WHERE expires_at <= ?', now);
  db.run('DELETE FROM email_codes WHERE expires_at <= ?', now);
  db.run('DELETE FROM telegram_logins WHERE expires_at <= ?', now);
  db.run('DELETE FROM hits WHERE at <= ?', now - HOUR);
}
sweep();
setInterval(sweep, 10 * MIN).unref();

createService('auth', [
  // какие способы входа доступны — по нему фронтенд показывает кнопки
  ['GET', '/api/auth/providers', (req, res) => {
    json(res, 200, { email: SMTP_ON || DEV_CODES, telegram: !!(bot && bot.ready), bot: bot && bot.ready ? '@' + bot.username : null });
  }],

  // ----- вход по почте -----
  ['POST', '/api/auth/email/start', async (req, res) => {
    const body = await readBody(req);
    const email = normalizeEmail(body.email);
    if (!email) throw new HttpError(400, 'Укажите корректный адрес почты');
    const ip = clientIp(req);
    limit(res, 'mail', email, 1, MIN, 'Код уже отправлен на этот адрес.');
    limit(res, 'mail', email, 5, HOUR, 'Слишком много кодов для этого адреса.');
    limit(res, 'mail-ip', ip, 20, HOUR, 'Слишком много запросов кода.');
    hit('mail', email);
    hit('mail-ip', ip);

    const code = String(crypto.randomInt(0, 1e6)).padStart(6, '0');
    const salt = crypto.randomBytes(16).toString('base64url');
    const codeHash = crypto.createHmac('sha256', salt).update(code).digest('hex');
    db.run('INSERT OR REPLACE INTO email_codes (email, code_hash, salt, attempts, expires_at) VALUES (?, ?, ?, 0, ?)', email, codeHash, salt, Date.now() + CODE_TTL);
    const answer = { ok: true, expires_in: CODE_TTL / 1000 };

    if (SMTP_ON) {
      try { await sendMail(SMTP, { to: email, subject: TEXT.mailSubject(code), text: TEXT.mailBody(code) }); }
      catch (e) {
        db.run('DELETE FROM email_codes WHERE email = ? AND code_hash = ?', email, codeHash);
        console.error(`[auth] письмо с кодом на ${email} не отправлено: ${e.message}`);
        throw new HttpError(503, 'Не удалось отправить письмо — попробуйте позже');
      }
      return json(res, 200, answer);
    }
    console.log(`[auth] SMTP не настроен — код для ${email}: ${code}`);
    json(res, 200, DEV_CODES ? { ...answer, dev_code: code } : answer);
  }],

  ['POST', '/api/auth/email/verify', async (req, res) => {
    const body = await readBody(req);
    const email = normalizeEmail(body.email);
    if (!email) throw new HttpError(400, 'Укажите корректный адрес почты');
    const code = String(body.code ?? '').replace(/\s+/g, '');
    if (!/^\d{6}$/.test(code)) throw new HttpError(400, 'Введите 6-значный код из письма');
    const name = body.name == null || cleanName(body.name) === '' ? null : requiredName(body.name);

    const row = db.get('SELECT * FROM email_codes WHERE email = ?', email);
    if (!row || row.expires_at <= Date.now()) {
      if (row) db.run('DELETE FROM email_codes WHERE email = ?', email);
      throw new HttpError(410, 'Код истёк или не запрашивался — запросите новый');
    }
    if (!same(crypto.createHmac('sha256', row.salt).update(code).digest('hex'), row.code_hash)) {
      const attempts = row.attempts + 1;
      if (attempts >= CODE_ATTEMPTS) {
        db.run('DELETE FROM email_codes WHERE email = ?', email);
        throw new HttpError(401, 'Неверный код. Попытки закончились — запросите новый код');
      }
      db.run('UPDATE email_codes SET attempts = ? WHERE email = ?', attempts, email);
      throw new HttpError(401, `Неверный код. Осталось попыток: ${CODE_ATTEMPTS - attempts}`);
    }
    db.run('DELETE FROM email_codes WHERE email = ?', email);

    let user = db.get('SELECT * FROM users WHERE email = ?', email);
    if (!user) user = createUser({ email, name: name || clipName(cleanName(email.split('@')[0])) || 'Пользователь' });
    startSession(res, user);
    json(res, 200, { user: userView(user) });
  }],

  // ----- вход через Telegram -----
  ['POST', '/api/auth/telegram/start', async (req, res) => {
    const name = await botName();
    const token = crypto.randomBytes(24).toString('base64url');
    db.run('INSERT INTO telegram_logins (token_hash, expires_at) VALUES (?, ?)', sha(token), Date.now() + TG_TTL);
    json(res, 200, { token, url: `https://t.me/${name}?start=${token}`, expires_in: TG_TTL / 1000 });
  }],

  // фронтенд опрашивает, пока пользователь не нажмёт «Старт» в боте; токен одноразовый
  ['GET', '/api/auth/telegram/check', (req, res, { url }) => {
    if (!bot) throw new HttpError(503, 'Вход через Telegram не настроен');
    const token = url.searchParams.get('token') || '';
    if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) throw new HttpError(400, 'Не передан токен входа');
    const hash = sha(token);
    const row = db.get('SELECT * FROM telegram_logins WHERE token_hash = ?', hash);
    if (!row || row.expires_at <= Date.now()) {
      if (row) db.run('DELETE FROM telegram_logins WHERE token_hash = ?', hash);
      throw new HttpError(410, 'Время на вход истекло — начните вход заново');
    }
    if (!row.confirmed_at) return json(res, 200, { status: 'pending' });
    db.run('DELETE FROM telegram_logins WHERE token_hash = ?', hash);
    const user = startSession(res, telegramUser(row));
    json(res, 200, { status: 'ok', user: userView(user) });
  }],

  // ----- сессия -----
  ['GET', '/api/auth/me', (req, res) => {
    const s = requireUser(req);
    // браузеру — свежий срок cookie (совпадает со сроком сессии в базе)
    if (s.cookie) setSid(res, s.token, s.renewed ? SESSION_TTL / 1000 : Math.floor((s.expires - Date.now()) / 1000));
    json(res, 200, { user: userView(s.user) });
  }],

  ['PATCH', '/api/auth/me', async (req, res) => {
    const s = requireUser(req);
    const body = await readBody(req);
    let user = s.user;
    if (body.name !== undefined) {
      const name = requiredName(body.name);
      user = { ...user, name };
      db.run('UPDATE users SET name = ?, search = ?, updated_at = ? WHERE id = ?', name, searchText(user), nowIso(), user.id);
    }
    json(res, 200, { user: userView(user) });
  }],

  ['POST', '/api/auth/logout', (req, res) => {
    for (const t of tokensOf(req)) db.run('DELETE FROM sessions WHERE token_hash = ?', sha(t.token));
    setSid(res, '', 0);
    json(res, 200, { ok: true });
  }],

  // ----- админка (только role=admin) -----
  ['GET', '/api/admin/users', (req, res, { url }) => {
    requireAdmin(req);
    const q = (url.searchParams.get('q') || '').trim().toLowerCase().slice(0, 100);
    const limitN = Math.min(200, Math.max(1, parseInt(url.searchParams.get('limit'), 10) || 50));
    const offset = Math.max(0, parseInt(url.searchParams.get('offset'), 10) || 0);
    let where = '';
    const args = [];
    if (q) {
      // поиск по имени, почте, @нику; число — ещё и по telegram id и id пользователя
      where = "WHERE (search LIKE ? ESCAPE '!'";
      args.push(`%${q.replace(/[!%_]/g, '!$&')}%`);
      if (/^\d{1,16}$/.test(q)) { where += ' OR telegram_id = ? OR id = ?'; args.push(Number(q), Number(q)); }
      where += ')';
    }
    const { total } = db.get(`SELECT COUNT(*) AS total FROM users ${where}`, ...args);
    const users = db.all(`SELECT * FROM users ${where} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`, ...args, limitN, offset);
    json(res, 200, { total, users: users.map(adminView) });
  }],

  // только блокировка/разблокировка; роль меняется лишь командой на сервере
  ['PATCH', '/api/admin/users/:id', async (req, res, { params }) => {
    requireAdmin(req);
    const body = await readBody(req);
    if (body.role !== undefined) throw new HttpError(400, 'Роль меняется только командой на сервере');
    if (typeof body.blocked !== 'boolean') throw new HttpError(400, 'Укажите blocked: true или false');
    const target = /^\d{1,16}$/.test(params.id) ? getUser(Number(params.id)) : null;
    if (!target) throw new HttpError(404, 'Пользователь не найден');
    if (body.blocked && target.role === 'admin') throw new HttpError(400, 'Администратора заблокировать нельзя');
    db.tx(() => {
      db.run('UPDATE users SET blocked = ?, updated_at = ? WHERE id = ?', body.blocked ? 1 : 0, nowIso(), target.id);
      if (body.blocked) db.run('DELETE FROM sessions WHERE user_id = ?', target.id);
    });
    json(res, 200, { user: adminView(getUser(target.id)) });
  }],

  // ----- для других сервисов (шлюз закрывает /_internal/ снаружи) -----
  ['POST', '/_internal/notify', async (req, res) => {
    const { body, text, subject } = await readNotice(req);
    const id = Number(body.user_id);
    if (!Number.isSafeInteger(id) || id <= 0) throw new HttpError(400, 'Укажите user_id');
    const user = getUser(id);
    if (!user) throw new HttpError(404, 'Пользователь не найден');
    json(res, 200, { sent: await deliver(user, text, subject) });
  }],

  ['POST', '/_internal/notify-admins', async (req, res) => {
    const { text, subject } = await readNotice(req);
    let sent = 0;
    for (const admin of db.all("SELECT * FROM users WHERE role = 'admin'")) if (await deliver(admin, text, subject)) sent++;
    json(res, 200, { sent });
  }],
]);

console.log(`[auth] почта: ${SMTP_ON ? `SMTP ${SMTP.host}:${SMTP.port}` : 'SMTP не настроен, коды пишутся в лог'}${!DEV_CODES ? ''
  : SMTP_ON ? '; DEV_LOGIN_CODES не действует — SMTP настроен' : '; DEV_LOGIN_CODES=1 — коды возвращаются в ответе (только для разработки!)'}`);
console.log(`[auth] Telegram: ${bot ? 'бот подключается…' : 'TELEGRAM_BOT_TOKEN не задан — вход через Telegram выключен'}`);
if (!db.get("SELECT id FROM users WHERE role = 'admin'")) console.log('[auth] администратор не назначен: войдите на сайт и выполните node tools/make-admin.js <почта | telegram id | @ник>');
