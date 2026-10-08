// Сервис гостей: ответы на анкету («приду / с парой / не приду») и пожелания.
// Знает только адрес API приглашений: есть ли приглашение, опубликовано ли, кто владелец.
// Удаление приглашения узнаёт из события invitation.deleted (POST /events).
const path = require('path');
const { env, json, send, readJson, api, HttpError, createService } = require('../lib/http');
const { openDb } = require('../lib/db');
const { classify, summary } = require('./rsvp');

const INVITATIONS_API = env('INVITATIONS_API');
const AUTH_API = env('AUTH_API');

const db = openDb(env('DB_FILE', path.join(__dirname, '..', 'data', 'guests.db')), [
  `CREATE TABLE answers (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     invitation_id TEXT NOT NULL,
     form_id TEXT,
     action TEXT,
     action_text TEXT,
     fields TEXT NOT NULL,
     created_at TEXT NOT NULL
   );
   CREATE INDEX answers_invitation ON answers (invitation_id);
   CREATE TABLE wishes (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     invitation_id TEXT NOT NULL,
     name TEXT NOT NULL,
     message TEXT NOT NULL,
     created_at TEXT NOT NULL
   );
   CREATE INDEX wishes_invitation ON wishes (invitation_id);`,
  // guest_key — случайный id устройства гостя: повторный ответ заменяет прежний
  `ALTER TABLE answers ADD COLUMN guest_key TEXT;
   CREATE INDEX answers_guest ON answers (invitation_id, form_id, guest_key);`,
  `ALTER TABLE answers ADD COLUMN status TEXT NOT NULL DEFAULT 'unknown';`,
]);

const clip = (s, n) => String(s ?? '').trim().slice(0, n);

// приглашение (кеш 30 с): гости могут отвечать только на опубликованные
const known = new Map();
async function invitation(id) {
  const hit = known.get(id);
  // помним только найденное (30 с): только что одобренное должно сразу принимать ответы
  if (hit && Date.now() - hit.at < 30e3) return hit.value;
  let value = null;
  try { value = await api(INVITATIONS_API, `/api/invitations/${encodeURIComponent(id)}`); }
  catch (e) { if (e.status !== 404) throw new HttpError(503, 'Сервис приглашений недоступен'); }
  if (value) { if (known.size > 5000) known.clear(); known.set(id, { at: Date.now(), value }); }
  return value;
}
async function requirePublished(id) {
  const x = await invitation(id);
  if (!x) throw new HttpError(404, 'Приглашение не найдено');
  if (x.status !== 'published') throw new HttpError(409, 'Приглашение ещё не опубликовано');
  return x;
}
// ответы видит только владелец (или админ): права по cookie проверяет сервис приглашений
async function requireOwner(req, id) {
  const headers = {};
  if (req.headers.authorization) headers.authorization = req.headers.authorization;
  if (req.headers.cookie) headers.cookie = req.headers.cookie;
  const res = await fetch(`${INVITATIONS_API.replace(/\/+$/, '')}/api/invitations/${encodeURIComponent(id)}/owner`, { headers, signal: AbortSignal.timeout(8000) })
    .catch(() => { throw new HttpError(503, 'Сервис приглашений недоступен'); });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new HttpError(res.status, e.error || 'Нет доступа');
  }
}

// не больше N запросов на запись за 10 минут с одного адреса
const hits = new Map();
function limit(req, max = 40) {
  const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  const now = Date.now(), list = (hits.get(ip) || []).filter(t => now - t < 600e3);
  if (list.length >= max) throw new HttpError(429, 'Слишком много запросов, попробуйте позже');
  list.push(now); hits.set(ip, list);
  if (hits.size > 10000) hits.clear();
}

const wishView = w => ({ id: w.id, name: w.name, message: w.message, created_at: w.created_at });
const answerView = a => ({ id: a.id, form_id: a.form_id, status: a.status, action: a.action, action_text: a.action_text, fields: JSON.parse(a.fields), created_at: a.created_at });
// уведомить хозяина о новом ответе — «отправил и забыл»
const ICON = { yes: '✅', plus_one: '👫', no: '❌', unknown: '❔' };
async function notifyOwner(invitationId, status, name) {
  if (!AUTH_API) return;
  try {
    const x = await api(INVITATIONS_API, `/_internal/invitations/${encodeURIComponent(invitationId)}`);
    if (!x.user_id) return;
    const text = `${ICON[status]} ${name || 'Гость'} — ${STATUS_RU[status]}
${x.title || 'Приглашение'}`;
    await api(AUTH_API, '/_internal/notify', { method: 'POST', body: { user_id: x.user_id, text } });
  } catch (e) { console.warn('[guests] уведомление не отправлено:', e.message); }
}

const STATUS_RU = { yes: 'Придёт', plus_one: 'Придёт с парой', no: 'Не придёт', unknown: 'Не указано' };
const csvCell = v => `"${String(v ?? '').replace(/"/g, '""').replace(/^([=+\-@])/, "'$1")}"`;

createService('guests', [
  ['POST', '/api/i/:id/rsvp', async (req, res, { params }) => {
    limit(req);
    await requirePublished(params.id);
    const b = await readJson(req);
    const fields = Object.fromEntries(Object.entries(b.fields || {}).slice(0, 20).map(([k, v]) => [clip(k, 120), clip(v, 500)]));
    const formId = clip(b.form_id, 40), guestKey = /^[\w-]{8,64}$/.test(b.guest_key || '') ? b.guest_key : null;
    const action = b.action == null ? null : clip(b.action, 60), actionText = b.action_text == null ? null : clip(b.action_text, 200);
    const status = classify(actionText, action, fields);
    db.tx(() => {
      if (guestKey) db.run('DELETE FROM answers WHERE invitation_id = ? AND form_id = ? AND guest_key = ?', params.id, formId, guestKey);
      db.run('INSERT INTO answers (invitation_id, form_id, action, action_text, fields, created_at, guest_key, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        params.id, formId, action, actionText, JSON.stringify(fields), new Date().toISOString(), guestKey, status);
    });
    json(res, 200, { ok: true, status });
    const guestName = Object.values(fields).find(v => v && v.length <= 80) || '';
    notifyOwner(params.id, status, guestName);
  }],

  // ответы гостей и сводка — только владельцу
  ['GET', '/api/i/:id/answers', async (req, res, { params }) => {
    await requireOwner(req, params.id);
    const answers = db.all('SELECT * FROM answers WHERE invitation_id = ? ORDER BY id DESC', params.id).map(answerView);
    json(res, 200, { summary: summary(answers), answers });
  }],

  // то же для Excel: CSV в UTF-8 с BOM
  ['GET', '/api/i/:id/answers.csv', async (req, res, { params }) => {
    await requireOwner(req, params.id);
    const rows = db.all('SELECT * FROM answers WHERE invitation_id = ? ORDER BY id', params.id).map(answerView);
    const lines = [['Когда', 'Ответ', 'Кнопка', 'Данные'].map(csvCell).join(';')];
    for (const a of rows) lines.push([new Date(a.created_at).toLocaleString('ru-RU', { timeZone: 'Asia/Almaty' }), STATUS_RU[a.status], a.action_text || a.action || '',
      Object.entries(a.fields).map(([k, v]) => `${k} ${v}`).join('; ')].map(csvCell).join(';'));
    send(res, 200, 'text/csv; charset=utf-8', '﻿' + lines.join('\r\n'), { 'Content-Disposition': `attachment; filename="answers-${params.id}.csv"` });
  }],

  ['GET', '/api/i/:id/wishes', async (req, res, { params }) => {
    if (!(await invitation(params.id))) throw new HttpError(404, 'Приглашение не найдено');
    json(res, 200, db.all('SELECT * FROM wishes WHERE invitation_id = ? ORDER BY id DESC', params.id).map(wishView));
  }],

  ['POST', '/api/i/:id/wishes', async (req, res, { params }) => {
    limit(req, 20);
    await requirePublished(params.id);
    const b = await readJson(req);
    const name = clip(b.name, 80), message = clip(b.message, 2000);
    if (!name || !message) throw new HttpError(400, 'Напишите имя и пожелание');
    db.run('INSERT INTO wishes (invitation_id, name, message, created_at) VALUES (?, ?, ?, ?)', params.id, name, message, new Date().toISOString());
    json(res, 200, { ok: true });
  }],

  // счётчики для списка приглашений: ?ids=a,b,c
  ['GET', '/api/guests/stats', (req, res, { url }) => {
    const ids = (url.searchParams.get('ids') || '').split(',').filter(Boolean).slice(0, 500);
    const out = {};
    for (const id of ids) {
      const rows = db.all('SELECT status FROM answers WHERE invitation_id = ?', id);
      out[id] = { ...summary(rows), answers: rows.length, wishes: db.get('SELECT COUNT(*) AS n FROM wishes WHERE invitation_id = ?', id).n };
    }
    json(res, 200, out);
  }],

  // события других сервисов
  ['POST', '/events', async (req, res) => {
    const e = await readJson(req);
    if (e.type === 'invitation.deleted' && e.id) {
      db.tx(() => {
        db.run('DELETE FROM answers WHERE invitation_id = ?', e.id);
        db.run('DELETE FROM wishes WHERE invitation_id = ?', e.id);
      });
      known.delete(e.id);
    }
    json(res, 200, { ok: true });
  }],
]);
