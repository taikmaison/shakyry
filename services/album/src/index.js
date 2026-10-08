// Сервис альбома: гости загружают фото с праздника.
// Знает только адрес API приглашений. Удаление приглашения узнаёт из события invitation.deleted.
const fs = require('fs');
const path = require('path');
const { env, json, readRaw, readJson, parseMultipart, sendFile, inside, notFound, api, HttpError, createService } = require('../lib/http');
const { openDb } = require('../lib/db');

const INVITATIONS_API = env('INVITATIONS_API');
const DATA = env('DATA_DIR', path.join(__dirname, '..', 'data'));
const FILES = path.join(DATA, 'files');
const MAX_PHOTO = 15e6;

const db = openDb(path.join(DATA, 'album.db'), [
  `CREATE TABLE photos (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     invitation_id TEXT NOT NULL,
     file TEXT NOT NULL,
     name TEXT,
     created_at TEXT NOT NULL
   );
   CREATE INDEX photos_invitation ON photos (invitation_id);`,
]);

const known = new Map();
async function requireInvitation(id, { published = false } = {}) {
  const hit = known.get(id);
  let x;
  // помним только найденное (30 с): только что одобренное должно сразу принимать фото
  if (hit && Date.now() - hit.at < 30e3) x = hit.value;
  else {
    x = null;
    try { x = await api(INVITATIONS_API, `/api/invitations/${encodeURIComponent(id)}`); }
    catch (e) { if (e.status !== 404) throw new HttpError(503, 'Сервис приглашений недоступен'); }
    if (x) { if (known.size > 5000) known.clear(); known.set(id, { at: Date.now(), value: x }); }
  }
  if (!x) throw new HttpError(404, 'Приглашение не найдено');
  if (published && x.status !== 'published') throw new HttpError(409, 'Приглашение ещё не опубликовано');
  return x;
}

// удалить фото может только хозяин приглашения (или админ): права по cookie проверяет сервис приглашений
async function requireOwner(req, id) {
  const headers = {};
  if (req.headers.authorization) headers.authorization = req.headers.authorization;
  if (req.headers.cookie) headers.cookie = req.headers.cookie;
  const res = await fetch(`${INVITATIONS_API.replace(/\/+$/, '')}/api/invitations/${encodeURIComponent(id)}/owner`, { headers, signal: AbortSignal.timeout(8000) })
    .catch(() => { throw new HttpError(503, 'Сервис приглашений недоступен'); });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new HttpError(res.status, e.error || 'Нет доступа'); }
}
// fs.promises.rm: синхронный rmSync в Node 24 на Windows молча не удаляет пути с не-ASCII символами
const removeDir = dir => fs.promises.rm(dir, { recursive: true, force: true });

// тип файла по первым байтам — принимаем только картинки
function imageExt(buf) {
  if (buf[0] === 0xff && buf[1] === 0xd8) return '.jpg';
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return '.png';
  if (buf.toString('latin1', 0, 4) === 'GIF8') return '.gif';
  if (buf.toString('latin1', 0, 4) === 'RIFF' && buf.toString('latin1', 8, 12) === 'WEBP') return '.webp';
  if (buf.toString('latin1', 4, 8) === 'ftyp') return /heic|heix|mif1/.test(buf.toString('latin1', 8, 12)) ? '.heic' : '.avif';
  return null;
}

createService('album', [
  ['GET', '/api/i/:id/album', async (req, res, { params }) => {
    await requireInvitation(params.id);
    json(res, 200, db.all('SELECT * FROM photos WHERE invitation_id = ? ORDER BY id DESC', params.id)
      .map(p => ({ id: p.id, name: p.name, created_at: p.created_at, url: `/files/albums/${params.id}/${p.file}` })));
  }],

  ['POST', '/api/i/:id/album', async (req, res, { params }) => {
    await requireInvitation(params.id, { published: true });
    const parts = parseMultipart(await readRaw(req, MAX_PHOTO + 1e5), req.headers['content-type']);
    const file = parts.find(p => p.name === 'file' && p.filename);
    if (!file || !file.body.length) throw new HttpError(400, 'Выберите фото');
    if (file.body.length > MAX_PHOTO) throw new HttpError(413, 'Фото больше 15 МБ');
    const ext = imageExt(file.body);
    if (!ext) throw new HttpError(400, 'Это не картинка');
    const name = ((parts.find(p => p.name === 'name') || {}).body || Buffer.alloc(0)).toString('utf8').trim().slice(0, 80);
    const stored = `${Date.now()}${Math.floor(Math.random() * 1000)}${ext}`;
    fs.mkdirSync(path.join(FILES, params.id), { recursive: true });
    fs.writeFileSync(path.join(FILES, params.id, stored), file.body);
    db.run('INSERT INTO photos (invitation_id, file, name, created_at) VALUES (?, ?, ?, ?)', params.id, stored, name, new Date().toISOString());
    json(res, 200, { ok: true });
  }],

  ['DELETE', '/api/i/:id/album/:photo', async (req, res, { params }) => {
    await requireOwner(req, params.id);
    const p = db.get('SELECT * FROM photos WHERE id = ? AND invitation_id = ?', Number(params.photo), params.id);
    if (!p) throw new HttpError(404, 'Фото не найдено');
    db.run('DELETE FROM photos WHERE id = ?', p.id);
    await fs.promises.rm(path.join(FILES, params.id, p.file), { force: true });
    json(res, 200, { ok: true });
  }],

  ['GET', '/files/albums/*', (req, res, { params }) => {
    const f = inside(FILES, params.rest);
    return f ? sendFile(req, res, f) : notFound(res);
  }],

  // счётчики для списка приглашений: ?ids=a,b,c
  ['GET', '/api/album/stats', (req, res, { url }) => {
    const ids = (url.searchParams.get('ids') || '').split(',').filter(Boolean).slice(0, 500);
    json(res, 200, Object.fromEntries(ids.map(id => [id, { photos: db.get('SELECT COUNT(*) AS n FROM photos WHERE invitation_id = ?', id).n }])));
  }],

  // события других сервисов
  ['POST', '/events', async (req, res) => {
    const e = await readJson(req);
    if (e.type === 'invitation.deleted' && e.id && /^[a-z0-9]+$/.test(e.id)) {
      db.run('DELETE FROM photos WHERE invitation_id = ?', e.id);
      await removeDir(path.join(FILES, e.id));
      known.delete(e.id);
    }
    json(res, 200, { ok: true });
  }],
]);
