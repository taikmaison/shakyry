// Telegram-бот на Bot API без библиотек: getMe при старте, отправка сообщений и приём обновлений одним из двух способов:
//  — long-polling (по умолчанию, VPS): getUpdates с offset, timeout 25 с;
//  — webhook (webhook = { url, secret }; Vercel): при старте getWebhookInfo, setWebhook — только если адрес другой;
//    обновления приходят в POST-маршрут сервиса и передаются в receive(). getUpdates в этом режиме не вызывается.
// Сеть пропала — пауза и повтор, сервис не падает.
// Сбой обработки обновления: в long-polling — только в лог; в webhook — update_id забывается, receive() бросает ошибку,
// маршрут отвечает 500 и Telegram доставляет обновление снова (onUpdate должен быть идемпотентным).
// apiUrl можно заменить (TELEGRAM_API_URL) — для локального Bot API сервера или тестов.
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ALLOWED = ['message'];

function createBot({ token, apiUrl = 'https://api.telegram.org', webhook = null, onUpdate, log = console }) {
  const base = `${apiUrl.replace(/\/+$/, '')}/bot${token}/`;
  let username = null;   // имя бота без @ (после успешного getMe)
  let disabled = false;  // токен не принят Telegram — дальше не пытаемся
  let stopped = false;
  let asking = null;     // идущий запрос getMe — параллельные вызовы ждут его
  const seen = new Map();  // недавние update_id → их обработка: Telegram повторяет webhook, если ответ не дошёл

  // вызов метода Bot API; в ошибке — только описание от Telegram, без токена
  async function call(method, params = {}, timeoutMs = 10000) {
    let res, data;
    try {
      res = await fetch(base + method, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params), signal: AbortSignal.timeout(timeoutMs),
      });
      data = await res.json().catch(() => null);
    } catch (e) {
      const err = new Error(`${method}: нет связи с Telegram (${(e.cause && e.cause.code) || e.name})`);
      err.network = true;
      throw err;
    }
    if (!data || !data.ok) {
      const err = new Error(`${method}: ${(data && data.description) || 'HTTP ' + res.status}`);
      err.status = (data && data.error_code) || res.status;
      err.retryAfter = data && data.parameters && data.parameters.retry_after;
      throw err;
    }
    return data.result;
  }

  const refused = e => e.status === 401 || e.status === 404;   // неверный токен

  // getMe один раз, результат запоминается
  function whoami() {
    if (username) return Promise.resolve(username);
    asking = asking || call('getMe')
      .then(me => (username = me.username), e => { if (refused(e)) disabled = true; throw e; })
      .finally(() => { asking = null; });
    return asking;
  }

  const send = (chatId, text) => call('sendMessage', { chat_id: chatId, text: String(text).slice(0, 4096) });

  // одно обновление (из getUpdates или webhook). Повтор, пришедший во время обработки, ждёт её итога.
  function receive(u) {
    if (!u || !Number.isSafeInteger(u.update_id)) return Promise.resolve();
    const id = u.update_id;
    if (seen.has(id)) return seen.get(id);
    // onUpdate — в микрозадаче: к моменту ошибки job уже в seen
    const job = Promise.resolve(u).then(onUpdate).then(() => {}, e => {
      log.error('[auth] Telegram: ошибка обработки сообщения:', e.message);
      if (!webhook) return;   // long-polling: offset уже сдвинут, повтора не будет
      seen.delete(id);        // webhook: повторная доставка обработается заново
      throw e;
    });
    seen.set(id, job);
    if (seen.size > 1000) seen.delete(seen.keys().next().value);
    return job;
  }

  async function connect() {
    for (let pause = 2000; !stopped && !username; pause = Math.min(pause * 2, 60000)) {
      try {
        await whoami();
        log.log(`[auth] Telegram-бот @${username} подключён`);
      } catch (e) {
        if (refused(e)) {
          disabled = true;
          log.error(`[auth] Telegram не принял TELEGRAM_BOT_TOKEN (${e.message}) — вход через Telegram отключён`);
          return false;
        }
        log.warn(`[auth] Telegram ${e.message}; повтор через ${pause / 1000} с`);
        await sleep(pause);
      }
    }
    return !stopped;
  }

  async function poll() {
    let offset = 0;
    for (let pause = 1000; !stopped;) {
      try {
        const updates = await call('getUpdates', { offset, timeout: 25, allowed_updates: ALLOWED }, 40000);
        pause = 1000;
        for (const u of updates) {
          offset = Math.max(offset, u.update_id + 1);
          await receive(u);
        }
      } catch (e) {
        if (stopped) return;
        if (refused(e)) {
          disabled = true;
          log.error(`[auth] Telegram: ${e.message} — опрос остановлен`);
          return;
        }
        // 409 — у бота включён webhook или его опрашивает другой процесс
        const wait = e.retryAfter ? e.retryAfter * 1000 : pause;
        log.warn(`[auth] Telegram ${e.message}; повтор через ${Math.round(wait / 1000)} с`
          + (/webhook/i.test(e.message) ? ' (у бота включён webhook: снимите его deleteWebhook или включите TELEGRAM_WEBHOOK=1)' : ''));
        await sleep(wait);
        pause = Math.min(pause * 2, 60000);
      }
    }
  }

  // webhook: ставим, только если в Telegram другой адрес (или он отвечал 401/403 — значит, сменился секрет)
  async function hook() {
    if (!webhook.url) return log.error('[auth] Telegram: адрес webhook не задан (TELEGRAM_WEBHOOK_URL или PUBLIC_URL) — обновления не принимаются');
    for (let pause = 2000; !stopped; pause = Math.min(pause * 2, 60000)) {
      try {
        const info = await call('getWebhookInfo');
        if (info.url !== webhook.url || /\b40[13]\b/.test(info.last_error_message || '')) {
          await call('setWebhook', { url: webhook.url, secret_token: webhook.secret, allowed_updates: ALLOWED, drop_pending_updates: false });
          log.log(`[auth] Telegram: webhook → ${webhook.url}`);
        } else if (info.last_error_message) {
          log.warn(`[auth] Telegram: последняя ошибка webhook: ${info.last_error_message}`);
        }
        return;
      } catch (e) {
        if (stopped) return;
        if (refused(e)) { disabled = true; return log.error(`[auth] Telegram: ${e.message} — webhook не установлен`); }
        if (e.status === 400) return log.error(`[auth] Telegram не принял webhook ${webhook.url}: ${e.message}`);
        const wait = e.retryAfter ? e.retryAfter * 1000 : pause;
        log.warn(`[auth] Telegram ${e.message}; повтор через ${Math.round(wait / 1000)} с`);
        await sleep(wait);
      }
    }
  }

  const life = (async () => { if (await connect()) await (webhook ? hook() : poll()); })()
    .catch(e => log.error('[auth] Telegram: бот остановлен из-за ошибки:', e));

  return {
    mode: webhook ? 'webhook' : 'polling',
    hooked: webhook ? life : null,   // webhook: завершится, когда адрес проверен/установлен (или не удалось)
    get username() { return username; },
    get ready() { return !!username && !disabled; },
    get disabled() { return disabled; },
    whoami, send, call, receive,
    stop() { stopped = true; },
  };
}

module.exports = { createBot };
