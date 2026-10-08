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
const SUBSCRIBERS = env('EVENT_SUBSCRIBERS', '').split(',').map(s => s.trim()).filter(Boolean);

const db = openDb(env('DB_FILE', path.join(__dirname, '..', 'data', 'invitations.db')), [
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
]);

const get = id => db.get('SELECT * FROM invitations WHERE id = ?', id);
const newId = () => crypto.randomBytes(6).toString('base64url').replace(/[-_]/g, 'x').slice(0, 8).toLowerCase();
const now = () => new Date().toISOString();

// для владельца и администратора — всё о приглашении
const ownerView = r => r && {
  id: r.id, url: `/i/${r.id}`, template_id: r.template_id, fields: JSON.parse(r.fields), status: r.status,
  moderation_note: r.moderation_note, live: !!r.live_fields, created_at: r.created_at, updated_at: r.updated_at,
  submitted_at: r.submitted_at, published_at: r.published_at,
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

// события — «отправил и забыл»: подписчик сам решает, что делать
function publish(event) {
  for (const url of SUBSCRIBERS)
    fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(event), signal: AbortSignal.timeout(5000) })
      .catch(e => console.warn(`[invitations] событие ${event.type} не доставлено в ${url}: ${e.message}`));
}
// уведомления через сервис входа (Telegram или почта) — тоже «отправил и забыл»
const title = r => { const f = JSON.parse(r.fields); return f.title || [f.name1, f.name2].filter(Boolean).join(' & ') || 'Приглашение'; };
function notify(pathname, body) {
  if (AUTH_API) api(AUTH_API, pathname, { method: 'POST', body }).catch(e => console.warn(`[invitations] уведомление не отправлено: ${e.message}`));
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

createService('invitations', [
  // мои приглашения
  ['GET', '/api/invitations', async (req, res) => {
    const user = await requireUser(req);
    json(res, 200, db.all('SELECT * FROM invitations WHERE user_id = ? ORDER BY created_at DESC', user.id).map(ownerView));
  }],

  // сохранить черновик — только после входа
  ['POST', '/api/invitations', async (req, res) => {
    const user = await requireUser(req);
    const body = await readJson(req);
    const fields = await validated(body);
    // защита от случайных дублей. Проверка и запись идут без await между ними,
    // поэтому два одновременных нажатия «Сохранить» не создадут две записи.
    const text = JSON.stringify(fields);
    const mine = db.all('SELECT * FROM invitations WHERE user_id = ? AND template_id = ? ORDER BY created_at DESC', user.id, fields.template_id);
    const same = mine.find(r => r.fields === text);
    if (same) return json(res, 200, { ...ownerView(same), duplicate: true });   // ровно такое уже есть — возвращаем его
    // на этом шаблоне уже есть другое — создаём только если автор подтвердил (force)
    if (mine.length && !body.force)
      return json(res, 409, { error: `У вас уже есть приглашение на шаблоне #${fields.template_id}`, existing: ownerView(mine[0]) });
    if (db.get("SELECT COUNT(*) AS n FROM invitations WHERE user_id = ? AND live_fields IS NULL", user.id).n >= MAX_DRAFTS)
      throw new HttpError(429, `Черновиков уже ${MAX_DRAFTS} — удалите ненужные, чтобы создать новый`);
    const id = newId(), t = now();
    db.run('INSERT INTO invitations (id, user_id, template_id, fields, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      id, user.id, fields.template_id, JSON.stringify(fields), 'draft', t, t);
    json(res, 200, ownerView(get(id)));
  }],

  // правка — новая версия снова становится черновиком; гости пока видят одобренную
  ['PUT', '/api/invitations/:id', async (req, res, { params }) => {
    await requireOwner(req, get(params.id));
    const fields = await validated(await readJson(req));
    db.run('UPDATE invitations SET template_id = ?, fields = ?, status = ?, moderation_note = NULL, updated_at = ? WHERE id = ?',
      fields.template_id, JSON.stringify(fields), 'draft', now(), params.id);
    json(res, 200, ownerView(get(params.id)));
  }],

  // отправить на модерацию
  ['POST', '/api/invitations/:id/submit', async (req, res, { params }) => {
    const row = get(params.id);
    const user = await requireOwner(req, row);
    if (row.status === 'pending') throw new HttpError(409, 'Уже на модерации');
    if (row.status === 'published') throw new HttpError(409, 'Эта версия уже опубликована');
    db.run('UPDATE invitations SET status = ?, moderation_note = NULL, submitted_at = ? WHERE id = ?', 'pending', now(), params.id);
    notify('/_internal/notify-admins', { text: `📝 Новая заявка на публикацию: «${title(row)}» (${row.id}, шаблон #${row.template_id}) от ${user.name || 'пользователя'}.
Проверьте чек об оплате в WhatsApp и одобрите: ${PUBLIC_URL}/admin` });
    json(res, 200, ownerView(get(params.id)));
  }],

  // одно приглашение для всех — только одобренная версия
  ['GET', '/api/invitations/:id', (req, res, { params }) => {
    const v = publicView(get(params.id));
    if (!v) throw new HttpError(404, 'Приглашение не найдено или ещё не опубликовано');
    json(res, 200, v);
  }],

  // текущая версия — владельцу и администратору (предпросмотр черновика)
  ['GET', '/api/invitations/:id/draft', async (req, res, { params }) => {
    const row = get(params.id);
    await requireOwner(req, row);
    json(res, 200, ownerView(row));
  }],

  // проверка прав — для других сервисов (ответы гостей, удаление фото): пересылают Cookie
  ['GET', '/api/invitations/:id/owner', async (req, res, { params }) => {
    await requireOwner(req, get(params.id));
    json(res, 200, { ok: true });
  }],

  ['DELETE', '/api/invitations/:id', async (req, res, { params }) => {
    await requireOwner(req, get(params.id));
    db.run('DELETE FROM invitations WHERE id = ?', params.id);
    publish({ type: 'invitation.deleted', id: params.id, at: now() });
    json(res, 200, { ok: true });
  }],

  // для сервисов (шлюз снаружи закрывает /_internal): кому слать уведомления об ответах гостей
  ['GET', '/_internal/invitations/:id', (req, res, { params }) => {
    const row = get(params.id);
    if (!row) throw new HttpError(404, 'Приглашение не найдено');
    json(res, 200, { id: row.id, user_id: row.user_id, live: !!row.live_fields, title: title(row) });
  }],

  // ---------- администратор ----------
  ['GET', '/api/admin/invitations', async (req, res, { url }) => {
    await requireAdmin(req);
    const q = (url.searchParams.get('q') || '').trim(), status = url.searchParams.get('status');
    const limit = Math.min(200, Number(url.searchParams.get('limit')) || 50), offset = Math.max(0, Number(url.searchParams.get('offset')) || 0);
    const where = [], args = [];
    if (['draft', 'pending', 'published', 'rejected'].includes(status)) { where.push('status = ?'); args.push(status); }
    if (url.searchParams.get('live') === '1') where.push('live_fields IS NOT NULL');
    if (q) { where.push('(id = ? OR fields LIKE ? OR CAST(user_id AS TEXT) = ?)'); args.push(q, `%${q.replace(/[%_]/g, '')}%`, q); }
    const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const order = status === 'pending' ? 'submitted_at ASC' : 'updated_at DESC';
    const total = db.get(`SELECT COUNT(*) AS n FROM invitations ${w}`, ...args).n;
    const rows = db.all(`SELECT * FROM invitations ${w} ORDER BY ${order} LIMIT ? OFFSET ?`, ...args, limit, offset);
    const counts = Object.fromEntries(db.all('SELECT status, COUNT(*) AS n FROM invitations GROUP BY status').map(r => [r.status, r.n]));
    json(res, 200, { total, counts, invitations: rows.map(r => ({ ...ownerView(r), user_id: r.user_id })) });
  }],

  ['POST', '/api/admin/invitations/:id/approve', async (req, res, { params }) => {
    await requireAdmin(req);
    const row = get(params.id);
    if (!row) throw new HttpError(404, 'Приглашение не найдено');
    const t = now();
    db.run('UPDATE invitations SET status = ?, moderation_note = NULL, live_template_id = template_id, live_fields = fields, published_at = ? WHERE id = ?', 'published', t, params.id);
    notify('/_internal/notify', { user_id: row.user_id, text: `✅ Приглашение «${title(row)}» одобрено и опубликовано. Ссылка для гостей: ${PUBLIC_URL}/i/${row.id}` });
    json(res, 200, ownerView(get(params.id)));
  }],

  ['POST', '/api/admin/invitations/:id/reject', async (req, res, { params }) => {
    await requireAdmin(req);
    const row = get(params.id);
    if (!row) throw new HttpError(404, 'Приглашение не найдено');
    const reason = String((await readJson(req)).reason || '').trim().slice(0, 500);
    if (!reason) throw new HttpError(400, 'Укажите причину');
    db.run('UPDATE invitations SET status = ?, moderation_note = ? WHERE id = ?', 'rejected', reason, params.id);
    notify('/_internal/notify', { user_id: row.user_id, text: `❌ Приглашение «${title(row)}» не прошло модерацию: ${reason}` });
    json(res, 200, ownerView(get(params.id)));
  }],

  // снять с публикации: гости больше не видят приглашение
  ['POST', '/api/admin/invitations/:id/unpublish', async (req, res, { params }) => {
    await requireAdmin(req);
    const row = get(params.id);
    if (!row) throw new HttpError(404, 'Приглашение не найдено');
    const reason = String((await readJson(req)).reason || '').trim().slice(0, 500) || null;
    db.run('UPDATE invitations SET live_fields = NULL, live_template_id = NULL, status = ?, moderation_note = ? WHERE id = ?', 'rejected', reason, params.id);
    notify('/_internal/notify', { user_id: row.user_id, text: `⛔ Приглашение «${title(row)}» снято с публикации${reason ? ': ' + reason : ''}` });
    json(res, 200, ownerView(get(params.id)));
  }],
]);
