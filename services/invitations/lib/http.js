// HTTP-помощники сервиса: маршруты, ответы, файлы, тело запроса, вызовы чужих API.
// У каждого сервиса своя копия этого файла — сервисы не делят код.
const http = require('http');
const fs = require('fs');
const path = require('path');

const env = (name, fallback) => (process.env[name] != null && process.env[name] !== '' ? process.env[name] : fallback);

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.xml': 'application/xml; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.avif': 'image/avif', '.heic': 'image/heic', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.mov': 'video/quicktime',
  '.webm': 'video/webm', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.otf': 'font/otf',
};

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

function send(res, status, type, body, headers = {}) {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff', ...headers });
  res.end(body);
}
const json = (res, status, obj) => send(res, status, TYPES['.json'], JSON.stringify(obj));
const html = (res, body, status = 200) => send(res, status, TYPES['.html'], body);
const notFound = res => json(res, 404, { error: 'Не найдено' });

// файл с поддержкой перемотки аудио/видео
function sendFile(req, res, file, { cache = false } = {}) {
  let st;
  try { st = fs.statSync(file); } catch { return notFound(res); }
  if (!st.isFile()) return notFound(res);
  const headers = {
    'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Accept-Ranges': 'bytes',
    'Cache-Control': cache ? 'public, max-age=604800' : 'no-cache', 'Last-Modified': st.mtime.toUTCString(), 'X-Content-Type-Options': 'nosniff',
  };
  const m = req.headers.range && req.headers.range.match(/bytes=(\d*)-(\d*)/);
  if (m && (m[1] || m[2])) {
    const start = m[1] ? Number(m[1]) : Math.max(0, st.size - Number(m[2]));
    const end = m[1] && m[2] ? Math.min(Number(m[2]), st.size - 1) : st.size - 1;
    res.writeHead(206, { ...headers, 'Content-Range': `bytes ${start}-${end}/${st.size}`, 'Content-Length': end - start + 1 });
    return req.method === 'HEAD' ? res.end() : fs.createReadStream(file, { start, end }).pipe(res);
  }
  res.writeHead(200, { ...headers, 'Content-Length': st.size });
  return req.method === 'HEAD' ? res.end() : fs.createReadStream(file).pipe(res);
}

// путь внутри папки, без выхода наружу
function inside(base, rel) {
  let p;
  try { p = path.join(base, decodeURIComponent(rel)); } catch { return null; }
  return p.startsWith(base + path.sep) ? p : null;
}

async function readRaw(req, limit = 25e6) {
  const chunks = [];
  let n = 0;
  for await (const c of req) {
    n += c.length;
    if (n > limit) throw new HttpError(413, 'Слишком большой запрос');
    chunks.push(c);
  }
  return Buffer.concat(chunks);
}
async function readJson(req) {
  const text = (await readRaw(req, 1e6)).toString('utf8');
  try { return text ? JSON.parse(text) : {}; } catch { throw new HttpError(400, 'Некорректный JSON'); }
}
function parseMultipart(buf, contentType) {
  const m = (contentType || '').match(/boundary=(?:"([^"]+)"|([^;]+))/);
  if (!m) return [];
  const boundary = Buffer.from('--' + (m[1] || m[2]));
  const parts = [];
  let pos = buf.indexOf(boundary);
  while (pos !== -1) {
    const next = buf.indexOf(boundary, pos + boundary.length);
    if (next === -1) break;
    const part = buf.subarray(pos + boundary.length + 2, next - 2);
    const he = part.indexOf('\r\n\r\n');
    if (he > 0) {
      const head = part.subarray(0, he).toString('utf8');
      parts.push({ name: (head.match(/name="([^"]*)"/) || [])[1], filename: (head.match(/filename="([^"]*)"/) || [])[1], body: part.subarray(he + 4) });
    }
    pos = next;
  }
  return parts;
}

// токен владельца из заголовка Authorization: Bearer <токен>
const bearer = req => ((req.headers.authorization || '').match(/^Bearer\s+(\S+)$/i) || [])[1] || null;

// вызов чужого API по адресу из переменной окружения
async function api(baseUrl, pathname, { method = 'GET', body, timeout = 8000, token } = {}) {
  if (!baseUrl) throw new HttpError(503, 'Адрес сервиса не задан');
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(baseUrl.replace(/\/+$/, '') + pathname, {
    method, signal: AbortSignal.timeout(timeout), headers, body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new HttpError(res.status, (data && data.error) || `${res.status}`);
  return data;
}
async function tryApi(baseUrl, pathname, fallback, opts) {
  try { return await api(baseUrl, pathname, opts); } catch { return fallback; }
}

// текущий пользователь: cookie сессии пересылается в API сервиса auth (кеш 20 с)
const userCache = new Map();
async function currentUser(req, authApi) {
  const cookie = req.headers.cookie || '';
  const sid = (cookie.match(/(?:^|;\s*)sid=([^;]+)/) || [])[1];
  if (!sid || !authApi) return null;
  const hit = userCache.get(sid);
  if (hit && Date.now() - hit.at < 20e3) return hit.user;
  let user = null;
  try {
    const res = await fetch(authApi.replace(/\/+$/, '') + '/api/auth/me', { headers: { cookie: `sid=${sid}` }, signal: AbortSignal.timeout(5000) });
    if (res.ok) user = (await res.json()).user || null;
    else if (res.status !== 401 && res.status !== 403) throw new Error(String(res.status));
  } catch { throw new HttpError(503, 'Сервис входа недоступен'); }
  if (userCache.size > 5000) userCache.clear();
  userCache.set(sid, { at: Date.now(), user });
  return user;
}

// routes: [['GET', '/api/x/:id', handler], ...]; handler(req, res, { params, url })
function compile(pattern) {
  return new RegExp('^' + pattern.replace(/\/\*$/, '/(?<rest>.*)').replace(/:(\w+)/g, '(?<$1>[^/]+)') + '/?$');
}
// Подозрительный путь: закодированные точки и слэши, обратный слэш, «//», сегменты «.» и «..».
// new URL() их схлопывает, и /api/auth/%2e%2e/%2e%2e/_internal/x превратился бы в /_internal/x —
// служебный адрес в обход маршрутизации (на Vercel перед сервисами нет шлюза, который это отсекает).
function suspiciousPath(rawUrl) {
  const p = String(rawUrl || '').split('?')[0];
  if (!p.startsWith('/') || p.startsWith('//') || /%2e|%2f|%5c|%00/i.test(p) || /[\\\0]/.test(p)) return true;
  let d;
  try { d = decodeURIComponent(p); } catch { return true; }
  return /\/\/|(^|\/)\.\.?(\/|$)/.test(d);
}

function createService(name, routes, { fallback } = {}) {
  const table = routes.map(([method, pattern, handler]) => ({ method, handler, re: compile(pattern) }));
  table.push({ method: 'GET', re: /^\/health$/, handler: (req, res) => json(res, 200, { service: name, ok: true }) });
  const server = http.createServer(async (req, res) => {
    if (suspiciousPath(req.url)) return notFound(res);
    const url = new URL(req.url, 'http://local');
    try {
      for (const r of table) {
        if (r.method !== req.method && !(r.method === 'GET' && req.method === 'HEAD')) continue;
        const m = url.pathname.match(r.re);
        if (m) return await r.handler(req, res, { params: m.groups || {}, url });
      }
      if (fallback) return await fallback(req, res, { url });
      notFound(res);
    } catch (e) {
      if (!(e instanceof HttpError)) console.error(`[${name}]`, e);
      if (res.headersSent) res.end();
      else if (e.html) send(res, e.status || 500, 'text/html; charset=utf-8', e.html, e.status === 503 ? { 'Retry-After': '5' } : {});
      else json(res, e.status || 500, { error: e.message });
    }
  });
  const port = Number(env('PORT', 3000)), host = env('HOST', '127.0.0.1');
  server.listen(port, host, () => console.log(`[${name}] http://${host}:${port}`));
  return server;
}

module.exports = { env, TYPES, HttpError, send, json, html, notFound, sendFile, inside, readRaw, readJson, parseMultipart, bearer, currentUser, api, tryApi, createService };
