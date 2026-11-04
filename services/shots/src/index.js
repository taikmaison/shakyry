// Снимки приглашений для превью ссылок (WhatsApp, Telegram): первый экран самого приглашения с настоящими именами,
// а не пример шаблона с образцовыми. Свой Chromium (puppeteer-core) открывает /i/:id?shot=1 через шлюз, JPEG хранится на диске.
//   GET  /og/i/:id.jpg?v=…        — снимок опубликованной версии (v только сбрасывает кеш мессенджера; что снимать, решаем сами)
//   POST /_internal/warm/:id      — снять заранее (веб-сервис зовёт при открытии приглашения)
//   POST /events                  — invitation.published → снять, invitation.unpublished / deleted → удалить
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { env, json, sendFile, readJson, api, HttpError, createService } = require('../lib/http');

const INVITATIONS_API = env('INVITATIONS_API');
const SITE = env('SITE_INTERNAL_URL', 'http://127.0.0.1:8024').replace(/\/+$/, '');
const DATA = path.resolve(env('DATA_DIR', path.join(__dirname, '..', 'data')));
const CHROME = env('CHROMIUM_PATH', ['/usr/bin/chromium-browser', '/usr/bin/chromium'].find(f => fs.existsSync(f)) || '');
const IDLE_MS = 5 * 60e3;   // браузер закрывается после 5 минут без снимков — память сервера не занята зря
fs.mkdirSync(DATA, { recursive: true });

const ID = /^[a-z0-9]{1,32}$/;
const REV = '1';   // поменять — все снимки переснимутся (например, после правки режима shot)
const version = x => crypto.createHash('sha1').update(JSON.stringify([REV, x.template_id, x.fields, x.published_at || ''])).digest('hex').slice(0, 12);
const sleep = ms => new Promise(r => setTimeout(r, ms));

// опубликованная версия приглашения или null
async function live(id) {
  try { return await api(INVITATIONS_API, `/api/invitations/${encodeURIComponent(id)}`, { timeout: 8000 }); }
  catch (e) { if (e.status === 404 || e.status === 410 || e.status === 400) return null; throw e; }
}

let browser = null, launching = null, idle = null;
async function getBrowser() {
  clearTimeout(idle);
  if (browser && browser.connected) return browser;
  if (!launching) {
    const puppeteer = require('puppeteer-core');
    launching = puppeteer.launch({
      executablePath: CHROME, headless: true, protocolTimeout: 45000,
      args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--mute-audio', '--hide-scrollbars', '--no-first-run',
        '--autoplay-policy=no-user-gesture-required', '--disable-renderer-backgrounding', '--disable-background-timer-throttling'],
    }).then(b => { browser = b; b.on('disconnected', () => { if (browser === b) browser = null; }); return b; })
      .finally(() => { launching = null; });
  }
  return launching;
}
const release = () => { clearTimeout(idle); idle = setTimeout(() => { const b = browser; browser = null; if (b) b.close().catch(() => {}); }, IDLE_MS); };

// тот же снимок, что у примеров шаблонов (catalog/tools/previews.js): 390×690 при 2× → 780×1380
async function render(id, file) {
  const page = await (await getBrowser()).newPage();
  try {
    await page.setViewport({ width: 390, height: 690, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    // видео грузятся потоком, и сеть может не затихнуть никогда — ждём недолго и снимаем как есть
    await page.goto(`${SITE}/i/${id}?shot=1`, { waitUntil: 'networkidle2', timeout: 25000 }).catch(e => { if (!/timeout/i.test(e.message)) throw e; });
    await page.evaluate(async () => {
      await Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 5000))]);
      await Promise.all([...document.querySelectorAll('video')].map(v => v.readyState >= 2 ? 0 : new Promise(r => { v.addEventListener('loadeddata', r, { once: true }); setTimeout(r, 4000); })));
    });
    await sleep(400);
    const jpg = await page.screenshot({ type: 'jpeg', quality: 78, captureBeyondViewport: false });
    fs.writeFileSync(file + '.tmp', jpg);
    fs.renameSync(file + '.tmp', file);
    const keep = path.basename(file);
    for (const f of fs.readdirSync(DATA)) if (f.startsWith(id + '-') && f !== keep) fs.rmSync(path.join(DATA, f), { force: true });
    console.log(`[shots] ${id}: снимок готов (${Math.round(jpg.length / 1024)} КБ)`);
    return file;
  } finally {
    await page.close().catch(() => {});
    release();
  }
}

// по одному снимку за раз (у сервера одно ядро); одинаковые запросы ждут один и тот же снимок
let queue = Promise.resolve();
const inflight = new Map();
function shoot(x) {
  const file = path.join(DATA, `${x.id}-${version(x)}.jpg`);
  if (fs.existsSync(file)) return Promise.resolve(file);
  if (!inflight.has(file)) {
    const p = queue.then(() => (fs.existsSync(file) ? file : render(x.id, file)));
    queue = p.catch(() => {});
    inflight.set(file, p);
    p.catch(e => console.warn(`[shots] ${x.id}: снимок не получился — ${String(e.message).split('\n')[0]}`)).finally(() => inflight.delete(file));
  }
  return inflight.get(file);
}
const warm = id => live(id).then(x => x && shoot(x)).catch(() => {});
function purge(id) {
  for (const f of fs.readdirSync(DATA)) if (f.startsWith(id + '-')) fs.rmSync(path.join(DATA, f), { force: true });
}
const within = (p, ms) => Promise.race([p, sleep(ms).then(() => { throw new Error('долго'); })]);

createService('shots', [
  ['GET', '/og/i/:file', async (req, res, { params }) => {
    const m = /^([a-z0-9]{1,32})\.jpg$/.exec(params.file);
    if (!m) throw new HttpError(404, 'Не найдено');
    const x = await live(m[1]);
    if (!x) throw new HttpError(404, 'Не найдено');
    let file;
    try { file = await within(shoot(x), 40000); } catch { file = null; }
    if (file) return sendFile(req, res, file, { cache: true });
    // снимок не вышел — пример шаблона, как было раньше (лучше, чем ссылка без картинки)
    res.writeHead(302, { Location: `/previews/${encodeURIComponent(x.template_id)}.jpg`, 'Cache-Control': 'no-cache' });
    res.end();
  }],

  ['POST', '/_internal/warm/:id', (req, res, { params }) => {
    if (ID.test(params.id)) warm(params.id);
    json(res, 202, { ok: true });
  }],

  ['POST', '/events', async (req, res) => {
    const e = await readJson(req);
    if (e.id && ID.test(e.id)) {
      if (e.type === 'invitation.published') warm(e.id);
      if (e.type === 'invitation.unpublished' || e.type === 'invitation.deleted') purge(e.id);
    }
    json(res, 200, { ok: true });
  }],
]);
