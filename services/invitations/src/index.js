// Сервис приглашений: черновики пользователей, модерация, публикация.
// Знает только адреса API каталога (есть ли шаблон) и сервиса входа (кто пользователь, уведомления).
// О гостях и альбоме не знает — при удалении публикует событие invitation.deleted.
//
// Порядок: вошедший пользователь сохраняет черновик → отправляет на модерацию → администратор
// одобряет (или отклоняет с причиной). Гости видят только одобренную версию; правки после
// одобрения уходят на повторную модерацию, а гости до одобрения видят прежнюю версию.
const path = require('path');
const crypto = require('crypto');
const { env, json, readJson, currentUser, api, HttpError, createService } = require('../lib/http');
const { openDb } = require('../lib/db');
const { cleanFields, FieldError } = require('./fields');

const CATALOG_API = env('CATALOG_API');
const AUTH_API = env('AUTH_API');
const MAX_DRAFTS = Number(env('MAX_DRAFTS', 20));   // неопубликованных приглашений у одного автора
const PUBLIC_URL = env('PUBLIC_URL', '').replace(/\/+$/, '');   // для ссылок в уведомлениях
// куда слать события: EVENT_SUBSCRIBERS (полные адреса через запятую), а если не задан —
// <GUESTS_API>/events и <ALBUM_API>/events (на Vercel привязка сервиса даёт только базовый адрес)
const SUBSCRIBERS = env('EVENT_SUBSCRIBERS', '').split(',').map(s => s.trim()).filter(Boolean);
if (!SUBSCRIBERS.length)
  for (const base of [env('GUESTS_API'), env('ALBUM_API')]) if (base) SUBSCRIBERS.push(base.replace(/\/+$/, '') + '/events');

// SQL общий для SQLite и Postgres. Число и порядок миграций не менять: SQLite помнит номер (user_version)
const db = openDb({ name: 'invitations', file: env('DB_FILE', path.join(__dirname, '..', 'data', 'invitations.db')), migrations: [
  `CREATE TABLE invitations (
     id TEXT PRIMARY KEY,
     user_id INTEGER NOT NULL,
     template_id INTEGER NOT NULL,
     fields TEXT NOT NULL,                 -- текущая версия владельца
     status TEXT NOT NULL DEFAULT 'draft', -- draft | pending | published | rejected (про текущую версию)
     moderation_note TEXT,                 -- причина отклонения
     live_template_id INTEGER,             -- одобренная версия — её видят гости
     live_fields TEXT,
     created_at TEXT NOT NULL,
     updated_at TEXT NOT NULL,
     submitted_at TEXT,
     published_at TEXT
   );
   CREATE INDEX invitations_user ON invitations (user_id);
   CREATE INDEX invitations_status ON invitations (status);`,
  // когда автор согласился с правилами (публикация платная) при отправке на публикацию
  `ALTER TABLE invitations ADD COLUMN terms_accepted_at TEXT;`,
] });

const get = id => db.get('SELECT * FROM invitations WHERE id = ?', id);
// UPDATE … RETURNING * → изменённая строка или undefined, если приглашения уже нет
const update = async (sql, ...args) => (await db.run(sql + ' RETURNING *', ...args)).rows[0];
const newId = () => crypto.randomBytes(6).toString('base64url').replace(/[-_]/g, 'x').slice(0, 8).toLowerCase();
const now = () => new Date().toISOString();

// для владельца и администратора — всё о приглашении
const ownerView = r => r && {
  id: r.id, url: `/i/${r.id}`, template_id: r.template_id, fields: JSON.parse(r.fields), status: r.status,
  moderation_note: r.moderation_note, live: !!r.live_fields, created_at: r.created_at, updated_at: r.updated_at,
  submitted_at: r.submitted_at, published_at: r.published_at, terms_accepted_at: r.terms_accepted_at,
};
// для всех — только одобренная версия
const publicView = r => r && r.live_fields && {
  id: r.id, url: `/i/${r.id}`, template_id: r.live_template_id, fields: JSON.parse(r.live_fields), status: 'published', published_at: r.published_at,
};

async function requireUser(req) {
  const user = await currentUser(req, AUTH_API);
  if (!user) throw new HttpError(401, 'Войдите, чтобы сохранять приглашения');
  return user;
}
async function requireAdmin(req) {
  const user = await requireUser(req);
  if (user.role !== 'admin') throw new HttpError(403, 'Только для администратора');
  return user;
}
async function requireOwner(req, row) {
  if (!row) throw new HttpError(404, 'Приглашение не найдено');
  const user = await requireUser(req);
  if (user.role !== 'admin' && row.user_id !== user.id) throw new HttpError(403, 'Это не ваше приглашение');
  return user;
}

// события подписчикам: подписчик сам решает, что делать. Доставку ждём (до 5 с) до ответа —
// на Vercel после ответа контейнер засыпает и неотправленное теряется. Ошибки — только в лог.
async function publish(event) {
  await Promise.allSettled(SUBSCRIBERS.map(url =>
    fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(event), signal: AbortSignal.timeout(5000) })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); })
      .catch(e => console.warn(`[invitations] событие ${event.type} не доставлено в ${url}: ${e.message}`))));
}
// уведомления через сервис входа (Telegram или почта): так же ждём до 5 с, сбой не отменяет действие
const title = r => { const f = JSON.parse(r.fields); return f.title || [f.name1, f.name2].filter(Boolean).join(' & ') || 'Приглашение'; };
async function notify(pathname, body) {
  if (AUTH_API) await api(AUTH_API, pathname, { method: 'POST', body, timeout: 5000 }).catch(e => console.warn(`[invitations] уведомление не отправлено: ${e.message}`));
}

async function validated(body) {
  let fields;
  try { fields = cleanFields(body); } catch (e) { if (e instanceof FieldError) throw new HttpError(400, e.message); throw e; }
  if (!fields.template_id) throw new HttpError(400, 'Укажите ID шаблона');
  if (!fields.date) throw new HttpError(400, 'Укажите дату');
  await api(CATALOG_API, `/api/templates/${fields.template_id}`).catch(e => {
    throw e.status === 404 ? new HttpError(400, 'Нет такого шаблона') : new HttpError(503, 'Каталог шаблонов недоступен');
  });
  return fields;
}

// запись нового черновика, если проверки всё ещё верны — в одной команде (INSERT … SELECT … WHERE).
// В Postgres перед ней — блокировка автора до конца транзакции: без неё два одновременных запроса
// не видят незакоммиченную строку друг друга и оба записывают. В SQLite запись и так идёт по одной.
async function insertDraft(user, fields, text, force) {
  const t = now();
  const insert = [`INSERT INTO invitations (id, user_id, template_id, fields, status, created_at, updated_at)
    SELECT ?, CAST(? AS INTEGER), CAST(? AS INTEGER), ?, 'draft', ?, ?
    WHERE NOT EXISTS (SELECT 1 FROM invitations WHERE user_id = ? AND template_id = ? AND (fields = ? OR ? = 0))
      AND (SELECT COUNT(*) FROM invitations WHERE user_id = ? AND live_fields IS NULL) < ?
    RETURNING *`, newId(), user.id, fields.template_id, text, t, t,
    user.id, fields.template_id, text, force ? 1 : 0, user.id, MAX_DRAFTS];
  const out = await db.batch(db.kind === 'pg' ? [['SELECT pg_advisory_xact_lock(hashtext(?))', `invitations:new:${user.id}`], insert] : [insert]);
  return out[out.length - 1].rows[0];
}

createService('invitations', [
  // мои приглашения
  ['GET', '/api/invitations', async (req, res) => {
    const user = await requireUser(req);
    json(res, 200, (await db.all('SELECT * FROM invitations WHERE user_id = ? ORDER BY created_at DESC', user.id)).map(ownerView));
  }],

  // сохранить черновик — только после входа
  ['POST', '/api/invitations', async (req, res) => {
    const user = await requireUser(req);
    const body = await readJson(req);
    const fields = await validated(body);
    // защита от случайных дублей: проверка с понятным ответом, затем запись, которая повторяет проверку
    // атомарно (insertDraft). Не записалось — параллельный запрос успел первым: проверяем заново.
    const text = JSON.stringify(fields);
    for (let attempt = 0; attempt < 3; attempt++) {
      const mine = await db.all('SELECT * FROM invitations WHERE user_id = ? AND template_id = ? ORDER BY created_at DESC', user.id, fields.template_id);
      const same = mine.find(r => r.fields === text);
      if (same) return json(res, 200, { ...ownerView(same), duplicate: true });   // ровно такое уже есть — возвращаем его
      // на этом шаблоне уже есть другое — создаём только если автор подтвердил (force)
      if (mine.length && !body.force)
        return json(res, 409, { error: `У вас уже есть приглашение на шаблоне #${fields.template_id}`, existing: ownerView(mine[0]) });
      if ((await db.get('SELECT COUNT(*) AS n FROM invitations WHERE user_id = ? AND live_fields IS NULL', user.id)).n >= MAX_DRAFTS)
        throw new HttpError(429, `Черновиков уже ${MAX_DRAFTS} — удалите ненужные, чтобы создать новый`);
      const row = await insertDraft(user, fields, text, body.force);
      if (row) return json(res, 200, ownerView(row));
    }
    throw new HttpError(409, 'Не удалось сохранить — попробуйте ещё раз');
  }],

  // правка — новая версия снова становится черновиком; гости пока видят одобренную
  ['PUT', '/api/invitations/:id', async (req, res, { params }) => {
    await requireOwner(req, await get(params.id));
    const fields = await validated(await readJson(req));
    const row = await update('UPDATE invitations SET template_id = ?, fields = ?, status = ?, moderation_note = NULL, updated_at = ? WHERE id = ?',
      fields.template_id, JSON.stringify(fields), 'draft', now(), params.id);
    if (!row) throw new HttpError(404, 'Приглашение не найдено');
    json(res, 200, ownerView(row));
  }],

  // отправить на модерацию
  ['POST', '/api/invitations/:id/submit', async (req, res, { params }) => {
    const row = await get(params.id);
    const user = await requireOwner(req, row);
    if (row.status === 'pending') throw new HttpError(409, 'Уже на модерации');
    if (row.status === 'published') throw new HttpError(409, 'Эта версия уже опубликована');
    if ((await readJson(req)).agree !== true) throw new HttpError(400, 'Отметьте, что согласны с правилами: публикация платная');
    const t = now();
    // статус проверяется и в самой записи — двойное нажатие не отправит заявку (и уведомление) дважды
    const sent = await update("UPDATE invitations SET status = ?, moderation_note = NULL, submitted_at = ?, terms_accepted_at = ? WHERE id = ? AND status NOT IN ('pending', 'published')",
      'pending', t, t, params.id);
    if (!sent) throw new HttpError(409, 'Уже на модерации');
    await notify('/_internal/notify-admins', { text: `📝 Новая заявка на публикацию: «${title(sent)}» (${sent.id}, шаблон #${sent.template_id}) от ${user.name || 'пользователя'}.
Проверьте чек об оплате в WhatsApp и одобрите: ${PUBLIC_URL}/admin` });
    json(res, 200, ownerView(sent));
  }],

  // одно приглашение для всех — только одобренная версия
  ['GET', '/api/invitations/:id', async (req, res, { params }) => {
    const v = publicView(await get(params.id));
    if (!v) throw new HttpError(404, 'Приглашение не найдено или ещё не опубликовано');
    json(res, 200, v);
  }],

  // текущая версия — владельцу и администратору (предпросмотр черновика)
  ['GET', '/api/invitations/:id/draft', async (req, res, { params }) => {
    const row = await get(params.id);
    await requireOwner(req, row);
    json(res, 200, ownerView(row));
  }],

  // проверка прав — для других сервисов (ответы гостей, удаление фото): пересылают Cookie
  ['GET', '/api/invitations/:id/owner', async (req, res, { params }) => {
    await requireOwner(req, await get(params.id));
    json(res, 200, { ok: true });
  }],

  ['DELETE', '/api/invitations/:id', async (req, res, { params }) => {
    await requireOwner(req, await get(params.id));
    await db.run('DELETE FROM invitations WHERE id = ?', params.id);
    await publish({ type: 'invitation.deleted', id: params.id, at: now() });
    json(res, 200, { ok: true });
  }],

  // для сервисов (шлюз снаружи закрывает /_internal): кому слать уведомления об ответах гостей
  ['GET', '/_internal/invitations/:id', async (req, res, { params }) => {
    const row = await get(params.id);
    if (!row) throw new HttpError(404, 'Приглашение не найдено');
    json(res, 200, { id: row.id, user_id: row.user_id, live: !!row.live_fields, title: title(row) });
  }],

  // ---------- администратор ----------
  ['GET', '/api/admin/invitations', async (req, res, { url }) => {
    await requireAdmin(req);
    const q = (url.searchParams.get('q') || '').trim(), status = url.searchParams.get('status');
    // только целые в границах: Postgres не примет NaN или дробь в LIMIT/OFFSET
    const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get('limit'), 10) || 50));
    const offset = Math.min(1e9, Math.max(0, parseInt(url.searchParams.get('offset'), 10) || 0));
    const where = [], args = [];
    if (['draft', 'pending', 'published', 'rejected'].includes(status)) { where.push('status = ?'); args.push(status); }
    if (url.searchParams.get('live') === '1') where.push('live_fields IS NOT NULL');
    // LOWER(…) LIKE LOWER(…): в SQLite LIKE и так без учёта регистра, в Postgres — нет
    if (q) { where.push('(id = ? OR LOWER(fields) LIKE LOWER(?) OR CAST(user_id AS TEXT) = ?)'); args.push(q, `%${q.replace(/[%_]/g, '')}%`, q); }
    const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const order = status === 'pending' ? 'submitted_at ASC' : 'updated_at DESC';
    const [total, rows, byStatus] = await Promise.all([
      db.get(`SELECT COUNT(*) AS n FROM invitations ${w}`, ...args).then(r => r.n),
      db.all(`SELECT * FROM invitations ${w} ORDER BY ${order} LIMIT ? OFFSET ?`, ...args, limit, offset),
      db.all('SELECT status, COUNT(*) AS n FROM invitations GROUP BY status'),
    ]);
    const counts = Object.fromEntries(byStatus.map(r => [r.status, r.n]));
    json(res, 200, { total, counts, invitations: rows.map(r => ({ ...ownerView(r), user_id: r.user_id })) });
  }],

  ['POST', '/api/admin/invitations/:id/approve', async (req, res, { params }) => {
    await requireAdmin(req);
    const row = await update('UPDATE invitations SET status = ?, moderation_note = NULL, live_template_id = template_id, live_fields = fields, published_at = ? WHERE id = ?',
      'published', now(), params.id);
    if (!row) throw new HttpError(404, 'Приглашение не найдено');
    await notify('/_internal/notify', { user_id: row.user_id, text: `✅ Приглашение «${title(row)}» одобрено и опубликовано. Ссылка для гостей: ${PUBLIC_URL}/i/${row.id}` });
    json(res, 200, ownerView(row));
  }],

  ['POST', '/api/admin/invitations/:id/reject', async (req, res, { params }) => {
    await requireAdmin(req);
    if (!await get(params.id)) throw new HttpError(404, 'Приглашение не найдено');
    const reason = String((await readJson(req)).reason || '').trim().slice(0, 500);
    if (!reason) throw new HttpError(400, 'Укажите причину');
    const row = await update('UPDATE invitations SET status = ?, moderation_note = ? WHERE id = ?', 'rejected', reason, params.id);
    if (!row) throw new HttpError(404, 'Приглашение не найдено');
    await notify('/_internal/notify', { user_id: row.user_id, text: `❌ Приглашение «${title(row)}» не прошло модерацию: ${reason}` });
    json(res, 200, ownerView(row));
  }],

  // снять с публикации: гости больше не видят приглашение
  ['POST', '/api/admin/invitations/:id/unpublish', async (req, res, { params }) => {
    await requireAdmin(req);
    if (!await get(params.id)) throw new HttpError(404, 'Приглашение не найдено');
    const reason = String((await readJson(req)).reason || '').trim().slice(0, 500) || null;
    const row = await update('UPDATE invitations SET live_fields = NULL, live_template_id = NULL, status = ?, moderation_note = ? WHERE id = ?', 'rejected', reason, params.id);
    if (!row) throw new HttpError(404, 'Приглашение не найдено');
    await notify('/_internal/notify', { user_id: row.user_id, text: `⛔ Приглашение «${title(row)}» снято с публикации${reason ? ': ' + reason : ''}` });
    json(res, 200, ownerView(row));
  }],
]);
