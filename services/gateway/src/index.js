// Шлюз: единая точка входа. Раздаёт запросы сервисам по routes.json и передаёт ответ потоком.
// Адреса сервисов — только из переменных окружения (CATALOG_URL, INVITATIONS_URL, ...).
const http = require('http');
const path = require('path');
const fs = require('fs');
const { env } = require('../lib/http');

const table = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'routes.json'), 'utf8')).routes
  .map(r => ({ re: new RegExp(r.match), target: r.target, base: r.target && env(r.target) ? new URL(env(r.target)) : null }));
for (const r of table) if (r.target && !r.base) console.warn(`[gateway] не задан адрес ${r.target}`);

// Путь запроса: только обычный абсолютный путь. Всё, что может увести запрос на другой хост
// или в другой раздел после нормализации (//, .., \, нулевой байт — в том числе закодированные), отклоняется.
// IP клиента для сервисов (лимиты). Снаружи заголовку не верим — иначе лимиты обходятся подделкой;
// TRUST_PROXY=1 — перед шлюзом стоит свой nginx/балансировщик, и его X-Real-IP / X-Forwarded-For верны.
const TRUST_PROXY = env('TRUST_PROXY', '') === '1';
function clientIp(req) {
  if (TRUST_PROXY) {
    const ip = String(req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || '').split(',')[0].trim();
    if (ip) return ip;
  }
  return req.socket.remoteAddress || '';
}

function safePath(rawUrl) {
  const q = rawUrl.indexOf('?');
  const p = q < 0 ? rawUrl : rawUrl.slice(0, q);
  const search = q < 0 ? '' : rawUrl.slice(q);
  if (!p.startsWith('/') || p.startsWith('//')) return null;
  let decoded;
  try { decoded = decodeURIComponent(p); } catch { return null; }
  if (/\\|\0|\/\/|(^|\/)\.\.?(\/|$)/.test(decoded) || /%2f|%5c/i.test(p)) return null;
  return { path: p, search };
}

function reply(res, status, body, type = 'application/json; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'X-Content-Type-Options': 'nosniff' });
  res.end(body);
}

const server = http.createServer((req, res) => {
  const safe = safePath(req.url);
  if (!safe) return reply(res, 400, '{"error":"Некорректный адрес"}');
  if (safe.path === '/health') return reply(res, 200, '{"service":"gateway","ok":true}');
  const route = table.find(r => r.re.test(safe.path));
  if (!route || !route.base) return reply(res, 404, '{"error":"Не найдено"}');
  const proxy = http.request({
    protocol: route.base.protocol, hostname: route.base.hostname, port: route.base.port,
    path: route.base.pathname.replace(/\/+$/, '') + safe.path + safe.search, method: req.method,
    headers: { ...req.headers, host: route.base.host, 'x-forwarded-host': req.headers.host || '', 'x-forwarded-for': clientIp(req) },
  }, up => { res.writeHead(up.statusCode, up.headers); up.pipe(res); });
  proxy.on('error', () => {
    if (res.headersSent) return res.end();
    reply(res, 502, '<!doctype html><meta charset="utf-8"><title>Сервис недоступен</title><p style="font:16px system-ui;padding:24px">Сервис временно недоступен. Обновите страницу через несколько секунд.</p>', 'text/html; charset=utf-8');
  });
  req.pipe(proxy);
});

const port = Number(env('PORT', 8024)), host = env('HOST', '127.0.0.1');
server.listen(port, host, () => console.log(`[gateway] http://${host}:${port}`));
