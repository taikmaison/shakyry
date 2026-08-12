/**
 * RSVP-relay: принимает ответы гостей со страницы приглашения и пересылает
 * их в Telegram через Bot API. Существует отдельно от каталога (который
 * лежит на статическом хостинге) именно потому, что статика не может
 * прятать секреты — а токен бота не должен попадать в HTML, который открыт
 * любому гостю.
 *
 * Секреты живут только в переменных окружения этого сервиса на Render:
 *   TELEGRAM_BOT_TOKEN — токен бота из @BotFather
 *   TELEGRAM_CHAT_ID   — числовой id чата, куда слать ответы
 *   RELAY_KEY          — общий пароль между страницей и этим сервером.
 *                        Он всё равно виден в исходнике страницы (она
 *                        публична), поэтому не секрет в строгом смысле —
 *                        только фильтр от случайного/автоматического спама,
 *                        не от целенаправленной атаки.
 *   ALLOWED_ORIGIN     — домен каталога, для CORS и Origin-проверки.
 */
import http from 'node:http';

const PORT = process.env.PORT || 3000;
const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const RELAY_KEY = process.env.RELAY_KEY || '';
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';

const ANSWER_LABELS = {
  yes: '✅ Барат',
  no: '🤝 Жубайы менен барат',
  maybe: '❌ Келе албайт',
};

// простейший лимит: не больше 20 запросов в минуту с одного IP,
// чтобы шальной скрипт не засыпал бота сообщениями
const hits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < 60_000);
  list.push(now);
  hits.set(ip, list);
  return list.length > 20;
}

function cors(res) {
  res.setHeader('access-control-allow-origin', ALLOWED_ORIGIN);
  res.setHeader('access-control-allow-headers', 'content-type');
  res.setHeader('access-control-allow-methods', 'POST, OPTIONS');
}

function send(res, status, body) {
  cors(res);
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') { cors(res); res.writeHead(204); res.end(); return; }
  if (req.url === '/health') { send(res, 200, { ok: true }); return; }
  if (req.method !== 'POST' || req.url !== '/rsvp') { send(res, 404, { error: 'not found' }); return; }
  if (!TOKEN || !CHAT_ID) { send(res, 500, { error: 'relay misconfigured: env vars missing' }); return; }

  const ip = req.socket.remoteAddress || 'unknown';
  if (rateLimited(ip)) { send(res, 429, { error: 'too many requests' }); return; }

  let raw = '';
  let tooBig = false;
  req.on('data', (chunk) => {
    raw += chunk;
    if (raw.length > 4096) { tooBig = true; req.destroy(); }
  });
  req.on('end', async () => {
    if (tooBig) return;
    let data;
    try { data = JSON.parse(raw || '{}'); } catch { send(res, 400, { error: 'bad json' }); return; }

    if (RELAY_KEY && data.key !== RELAY_KEY) { send(res, 401, { error: 'unauthorized' }); return; }

    const name = String(data.name || '').trim().slice(0, 200);
    const answer = String(data.answer || '').trim().slice(0, 20);
    const invite = String(data.invite || '').trim().slice(0, 100);
    if (!name || !answer) { send(res, 400, { error: 'name and answer are required' }); return; }

    const label = ANSWER_LABELS[answer] || answer;
    const text = `💌 Жаңы жооп${invite ? ' — ' + invite : ''}\n\n👤 ${name}\n${label}`;

    try {
      const tgRes = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ chat_id: CHAT_ID, text }),
      });
      if (!tgRes.ok) {
        console.error('telegram sendMessage failed', tgRes.status, await tgRes.text());
        send(res, 502, { error: 'telegram delivery failed' });
        return;
      }
      send(res, 200, { ok: true });
    } catch (e) {
      console.error('relay error', e);
      send(res, 502, { error: 'relay error' });
    }
  });
});

server.listen(PORT, () => console.log('rsvp-relay listening on port', PORT));
