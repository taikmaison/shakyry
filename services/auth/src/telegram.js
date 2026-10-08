// Telegram-бот на Bot API без библиотек: getMe при старте, приём обновлений long-polling'ом
// (getUpdates с offset, timeout 25 с), отправка сообщений. Сеть пропала — пауза и повтор, сервис не падает.
// apiUrl можно заменить (TELEGRAM_API_URL) — для локального Bot API сервера или тестов.
const sleep = ms => new Promise(r => setTimeout(r, ms));

function createBot({ token, apiUrl = 'https://api.telegram.org', onUpdate, log = console }) {
  const base = `${apiUrl.replace(/\/+$/, '')}/bot${token}/`;
  let username = null;   // имя бота без @ (после успешного getMe)
  let disabled = false;  // токен не принят Telegram — дальше не пытаемся
  let stopped = false;

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

  async function whoami() {
    const me = await call('getMe');
    username = me.username;
    return username;
  }

  const send = (chatId, text) => call('sendMessage', { chat_id: chatId, text: String(text).slice(0, 4096) });

  async function run() {
    for (let pause = 2000; !stopped && !username; pause = Math.min(pause * 2, 60000)) {
      try {
        await whoami();
        log.log(`[auth] Telegram-бот @${username} подключён`);
      } catch (e) {
        if (refused(e)) {
          disabled = true;
          log.error(`[auth] Telegram не принял TELEGRAM_BOT_TOKEN (${e.message}) — вход через Telegram отключён`);
          return;
        }
        log.warn(`[auth] Telegram ${e.message}; повтор через ${pause / 1000} с`);
        await sleep(pause);
      }
    }
    let offset = 0;
    for (let pause = 1000; !stopped;) {
      try {
        const updates = await call('getUpdates', { offset, timeout: 25, allowed_updates: ['message'] }, 40000);
        pause = 1000;
        for (const u of updates) {
          offset = Math.max(offset, u.update_id + 1);
          try { await onUpdate(u); } catch (e) { log.error('[auth] Telegram: ошибка обработки сообщения:', e.message); }
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
        log.warn(`[auth] Telegram ${e.message}; повтор через ${Math.round(wait / 1000)} с`);
        await sleep(wait);
        pause = Math.min(pause * 2, 60000);
      }
    }
  }
  run().catch(e => log.error('[auth] Telegram: опрос остановлен из-за ошибки:', e));

  return {
    get username() { return username; },
    get ready() { return !!username && !disabled; },
    get disabled() { return disabled; },
    whoami, send, call,
    stop() { stopped = true; },
  };
}

module.exports = { createBot };
