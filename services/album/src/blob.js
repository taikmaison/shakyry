// Vercel Blob без зависимостей — тот же протокол, что у @vercel/blob 2.8 (PUT /?pathname=…, POST /delete).
// Включается переменной BLOB_READ_WRITE_TOKEN (vercel_blob_rw_<storeId>_<секрет>).
const API = (process.env.VERCEL_BLOB_API_URL || 'https://vercel.com/api/blob').replace(/\/+$/, '');
const token = () => (process.env.BLOB_READ_WRITE_TOKEN || '').trim();
const enabled = () => !!token();
const isBlobUrl = f => /^https?:\/\//.test(f || '');

async function request(pathname, { method, body, headers = {}, timeout = 20000 }) {
  const t = token(), storeId = t.split('_')[3] || '';
  for (let attempt = 0; ; attempt++) {
    let res, err;
    try {
      res = await fetch(API + pathname, {
        method, body, signal: AbortSignal.timeout(timeout),
        headers: {
          'x-api-version': '12', 'x-vercel-blob-store-id': storeId, 'x-api-blob-request-attempt': String(attempt),
          'x-api-blob-request-id': `${storeId}:${Date.now()}:${Math.random().toString(16).slice(2)}`,
          authorization: `Bearer ${t}`, ...headers,
        },
      });
    } catch (e) { err = e; }
    if (res && res.ok) return res.json().catch(() => ({}));
    const data = res ? await res.json().catch(() => ({})) : {};
    const e = data.error || {};
    // один повтор: сбой сети (не таймаут) или ошибка на стороне хранилища
    if (attempt < 1 && (err ? err.name !== 'TimeoutError' : res.status >= 500)) { await new Promise(r => setTimeout(r, 500)); continue; }
    throw Object.assign(new Error(`Vercel Blob: ${e.message || e.code || (err && err.message) || 'ошибка'} (${res ? res.status : 'сеть'})`), { code: e.code, status: res && res.status });
  }
}

// загрузить файл (Buffer) публично, со случайным суффиксом в имени → постоянный адрес файла
async function put(pathname, body, contentType) {
  const r = await request(`/?${new URLSearchParams({ pathname })}`, {
    method: 'PUT', body,
    headers: { 'x-vercel-blob-access': 'public', 'x-add-random-suffix': '1', ...(contentType ? { 'x-content-type': contentType } : {}) },
  });
  if (!r.url) throw new Error('Vercel Blob: в ответе нет url');
  return r.url;
}

// удалить файлы по адресам (пачками по 100)
async function del(urls) {
  urls = urls.filter(isBlobUrl);
  for (let i = 0; i < urls.length; i += 100) {
    await request('/delete', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ urls: urls.slice(i, i + 100) }), timeout: 10000 });
  }
}

module.exports = { enabled, isBlobUrl, put, del };
