// Сервис веб-страниц: генератор, страницы приглашений и примеров, альбом, SEO, статика public/.
// Данные берёт только через API каталога и приглашений (адреса — из окружения).
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { env, html, send, sendFile, inside, readRaw, api, tryApi, HttpError, createService } = require('../lib/http');
const seo = require('./seo');

const CATALOG_API = env('CATALOG_API');
const INVITATIONS_API = env('INVITATIONS_API');
const PUBLIC = path.resolve(env('PUBLIC_DIR', path.join(__dirname, '..', 'public')));
const read = f => fs.readFileSync(path.join(PUBLIC, f), 'utf8');
// версии статики: ?v=<хеш содержимого> → браузер кеширует на год, после правки адрес меняется сам
const ASSETS = {};
for (const f of ['/invite.js', '/invite.css', '/landing.css', '/tbar.css']) {
  try { ASSETS[f] = crypto.createHash('sha1').update(fs.readFileSync(path.join(PUBLIC, f))).digest('hex').slice(0, 10); } catch { /* файла нет */ }
}
const versioned = page => page.replace(/(href|src)="(\/[\w.-]+\.(?:css|js))"/g, (m, a, f) => (ASSETS[f] ? `${a}="${f}?v=${ASSETS[f]}"` : m));
const config = {
  siteName: env('SITE_NAME', 'Шақыру'),
  siteUrl: env('PUBLIC_URL', 'http://127.0.0.1:8024').replace(/\/+$/, ''),
  defaultLang: env('DEFAULT_LANG', 'kz'),
  whatsapp: env('CONTACT_WHATSAPP', '').replace(/\D/g, ''),   // для заказа индивидуального дизайна, напр. 77780122500
  payment: env('PAYMENT_DETAILS', '').trim().slice(0, 200),   // как оплатить, напр. «Kaspi Gold +7 … (Имя Ф.)»; пусто — уточняют в WhatsApp
  assets: ASSETS,
  // подтверждение прав в Search Console / Яндекс Вебмастере / Bing (коды из их кабинетов; пусто — тегов нет)
  verify: { google: env('SEO_VERIFY_GOOGLE', '').trim(), yandex: env('SEO_VERIFY_YANDEX', '').trim(), bing: env('SEO_VERIFY_BING', '').trim() },
  metrika: env('YANDEX_METRIKA_ID', '').replace(/\D/g, ''),   // счётчик Яндекс.Метрики; пусто — без счётчика
};
// IndexNow: ключ в /<ключ>.txt, после старта адреса из sitemap отправляются Яндексу и Bing (пусто — выключено)
const INDEXNOW_KEY = /^[A-Za-z0-9-]{8,128}$/.test(env('INDEXNOW_KEY', '')) ? env('INDEXNOW_KEY', '') : '';
if (env('INDEXNOW_KEY', '') && !INDEXNOW_KEY) console.warn('[web] INDEXNOW_KEY: допустимы 8–128 символов A-Za-z0-9-, IndexNow выключен');
const abs = p => config.siteUrl + p;
const jsonScript = (name, data) => `<script>window.${name}=${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
const ogImage = id => abs(`/previews/${id}.jpg`);
// картинка ссылки на приглашение: снимок самого приглашения с настоящими именами (сервис shots),
// без сервиса — пример шаблона. v меняется с опубликованной версией — мессенджер не покажет старую картинку
const SHOTS_API = env('SHOTS_API', '').replace(/\/+$/, '');
const warmed = new Map();
function inviteImage(x) {
  if (!SHOTS_API) return ogImage(x.template_id);
  const v = crypto.createHash('sha1').update(JSON.stringify([x.template_id, x.fields, x.published_at || ''])).digest('hex').slice(0, 10);
  if (warmed.get(x.id) !== v) {   // снять заранее, пока мессенджер читает страницу
    if (warmed.size > 5000) warmed.clear();
    warmed.set(x.id, v);
    fetch(`${SHOTS_API}/_internal/warm/${encodeURIComponent(x.id)}`, { method: 'POST', signal: AbortSignal.timeout(3000) }).catch(() => warmed.delete(x.id));
  }
  return abs(`/og/i/${x.id}.jpg?v=${v}`);
}
const htmlLang = l => (l === 'ru' ? 'ru' : 'kk');

// каталог нужен для главной, sitemap и посадочных — держим копию минуту.
// Пока каталог ни разу не ответил — 503 с Retry-After (а не пустой sitemap и не 404 посадочных:
// поисковик принял бы их за удалённые страницы).
let catalogCache = { at: 0, list: [] };
async function catalog() {
  if (Date.now() - catalogCache.at > 60e3) {
    try { catalogCache = { at: Date.now(), list: await lookup(CATALOG_API, '/api/templates') || [] }; }
    catch { catalogCache.at = Date.now() - 55e3; }   // сервис просыпается — прежний список, повтор через 5 с
  }
  if (!catalogCache.list.length) throw new Unavailable();
  return catalogCache.list;
}
// Ответ другого сервиса: «нет такого» (404/410) → null; не ответил или ошибка → ещё одна попытка,
// потом Unavailable — гость увидит «обновите страницу», а не «приглашение не найдено»
// (на Vercel сервисы засыпают, и первый запрос после простоя может не успеть).
const WAKING = `<!doctype html><html lang="kk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="refresh" content="5"><meta name="robots" content="noindex"><title>Бір сәт… / Секунду…</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;font:16px/1.5 system-ui,sans-serif;background:#f6f3ee;color:#2b2620;text-align:center;padding:24px}</style></head>
<body><div><h1 style="font-weight:600">Бір сәт күте тұрыңыз…<br>Секунду, страница загружается…</h1><p>Бет өздігінен жаңарады. Страница обновится сама.</p></div></body></html>`;
// e.html — createService отдаст страницу (с Retry-After), а не JSON
class Unavailable extends HttpError { constructor() { super(503, 'Сервис временно недоступен — обновите страницу'); this.html = WAKING; } }
async function lookup(base, pathname, opts) {
  for (let attempt = 0; ; attempt++) {
    try { return await api(base, pathname, opts); }
    catch (e) {
      if (e.status === 404 || e.status === 410 || e.status === 400) return null;
      if (attempt >= 1) throw new Unavailable();
      await new Promise(r => setTimeout(r, 500));
    }
  }
}
const renderTemplate = (id, body) => lookup(CATALOG_API, `/api/templates/${id}/render`, { method: 'POST', body, timeout: 15000 });

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// плашка над приглашением, которое гости ещё не видят (черновик, модерация, предпросмотр)
function banner(text, link) {
  return `<div style="position:fixed;top:0;left:0;right:0;z-index:5000;background:#2b2620;color:#fff;font:14px/1.4 system-ui,sans-serif;padding:10px 14px;display:flex;gap:12px;justify-content:center;align-items:center;flex-wrap:wrap;text-align:center">`
    + `<span>${esc(text)}</span>${link ? `<a href="${esc(link.href)}" style="color:#f1d9a8">${esc(link.text)}</a>` : ''}</div>`;
}

// top — HTML перед приглашением (плашка, полоса), bottom — после него (текстовый блок страницы примера)
function invitePage(res, data, head, top = '', bottom = '') {
  let page = read('invite.html');
  const usesLottie = data.blocks.some(b => (b.components || []).some(c => c.type === 'lottie'));
  if (!usesLottie) page = page.replace(/<script src="\/vendor\/lottie_light\.min\.js"><\/script>\r?\n/, '');
  // bottom есть только у страницы примера — класс tpage включает отступ под полосу (tbar.css)
  html(res, versioned(page.replace('<!--HEAD-->', head + heroHints(data)).replace('<!--DATA-->', top + jsonScript('__INVITE__', data)).replace('<!--BOTTOM-->', bottom)
    .replace('<html lang="kk">', `<html lang="${htmlLang(data.lang)}">`).replace('<body>', bottom ? '<body class="tpage">' : '<body>')));
}
// Первые картинки приглашения браузер узнаёт только после выполнения invite.js — подсказываем их заранее:
// фон конверта (если он есть, виден первым), иначе фон первого блока и первая картинка первого блока.
function heroHints(data) {
  const out = [];
  const add = u => { if (typeof u === 'string' && /^\/(media|previews)\//.test(u) && !out.includes(u)) out.push(u); };
  const env = data.envelope || {};
  if (data.mode !== 'shot' && env && env.background) add(env.background);
  const b = (data.blocks || [])[0];
  if (b) {
    const st = b.style || {};
    if (st.backgroundImage && st.backgroundImage !== 'None') add(st.backgroundImage);
    const imgs = (b.components || []).filter(c => c.type === 'image' && c.data && c.data.src)
      .sort((x, y) => Number((x.position || {}).y || 0) - Number((y.position || {}).y || 0));
    if (imgs[0]) add(imgs[0].data.src);
  }
  return out.slice(0, 2).map(u => `<link rel="preload" as="image" href="${esc(u)}" fetchpriority="high">`).join('');
}
// что есть в шаблоне — по типам компонентов (для описания страницы примера)
function featuresOf(data) {
  const types = new Set((data.blocks || []).flatMap(b => (b.components || []).map(c => String(c.type || ''))));
  const has = (...ts) => ts.some(t => types.has(t));
  const f = [];
  if (data.envelope) f.push('envelope');
  if (has('audio', 'audio-fixed')) f.push('music');
  if (has('timer')) f.push('timer');
  if (has('calendar', 'calendar-pro', 'scroll-timeline')) f.push('calendar');
  if (has('form', 'form2', 'form3')) f.push('rsvp');
  if (has('wishes-list', 'fixed-wishes')) f.push('wishes');
  if ((data.blocks || []).some(b => (b.components || []).some(c => c.type === 'button' && /2gis|google|maps|yandex|example\.com/i.test(String((c.data || {}).url || (c.data || {}).href || ''))))) f.push('map');
  if (has('gallery', 'photo-marquee')) f.push('gallery');
  return f;
}
// после старта один раз сообщить Яндексу и Bing все индексируемые адреса (IndexNow); Google его не поддерживает
async function indexNow() {
  if (!INDEXNOW_KEY || !/^https:/i.test(config.siteUrl)) return;
  let urls;
  try { urls = seo.indexableUrls({ config, catalog: await catalog() }); } catch { return setTimeout(indexNow, 120e3); }
  const body = { host: new URL(config.siteUrl).host, key: INDEXNOW_KEY, keyLocation: abs(`/${INDEXNOW_KEY}.txt`), urlList: urls.slice(0, 10000) };
  const r = await fetch('https://api.indexnow.org/indexnow', { method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(body), signal: AbortSignal.timeout(15000) }).catch(() => null);
  console.log(`[web] IndexNow: ${r ? r.status : 'нет связи'} (${urls.length} адресов)`);
}
setTimeout(indexNow, 60e3).unref();

// черновик — владельцу и администратору: cookie посетителя пересылается в API приглашений
async function draftFor(req, id) {
  if (!req.headers.cookie) return null;
  const r = await fetch(`${INVITATIONS_API.replace(/\/+$/, '')}/api/invitations/${encodeURIComponent(id)}/draft`, { headers: { cookie: req.headers.cookie }, signal: AbortSignal.timeout(8000) }).catch(() => null);
  if (!r || r.status >= 500) throw new Unavailable();
  return r.ok ? r.json() : null;
}
const STATUS = { draft: 'Черновик — гости его пока не видят', pending: 'Ждёт оплаты и проверки — гости увидят приглашение после публикации',
  rejected: 'Не прошло модерацию', published: 'Опубликовано' };

createService('web', [
  // генератор: каталог вложен в страницу (сетка рисуется без запросов к API), внизу — ссылки на посадочные
  ['GET', '/', async (req, res, { url }) => {
    const list = await catalog();
    html(res, versioned(read('index.html')
      .replace('<!--HEAD-->', seo.homeHead({ config, catalog: list, preloadFirst: !url.search }) + jsonScript('__SITE__', { whatsapp: config.whatsapp, payment: config.payment, templates: list }))
      .replace('<!--FOOTER-->', seo.siteFooter({ config, catalog: list, lang: null }))));
  }],

  // приглашение: гостям — одобренная версия; владельцу с ?draft или без одобренной версии — текущая, с плашкой
  ['GET', '/i/:id', async (req, res, { params, url }) => {
    const id = encodeURIComponent(params.id);
    const live = url.searchParams.has('draft') ? null : await lookup(INVITATIONS_API, `/api/invitations/${id}`);
    if (live) {
      const page = await renderTemplate(live.template_id, { fields: live.fields });
      if (!page) return send(res, 410, 'text/plain; charset=utf-8', 'Шаблон этого приглашения больше недоступен');
      // ?shot — снимок для превью ссылки (сервис shots): без конверта и анимаций
      const shot = url.searchParams.has('shot');
      const data = { mode: shot ? 'shot' : 'invite', id: live.id, ...page, api: { rsvp: `/api/i/${live.id}/rsvp`, wishes: `/api/i/${live.id}/wishes`, album: `/i/${live.id}/album` } };
      return invitePage(res, data, seo.inviteHead({ config, data, url: abs(`/i/${live.id}`), image: shot ? ogImage(live.template_id) : inviteImage(live) }));
    }
    const draft = await draftFor(req, params.id);
    if (!draft) return html(res, notPublishedPage(), 404);
    const page = await renderTemplate(draft.template_id, { fields: draft.fields });
    if (!page) return send(res, 410, 'text/plain; charset=utf-8', 'Шаблон этого приглашения больше недоступен');
    const note = draft.status === 'rejected' && draft.moderation_note ? `${STATUS.rejected}: ${draft.moderation_note}` : STATUS[draft.status];
    invitePage(res, { mode: 'preview', id: draft.id, ...page }, '<title>Предпросмотр</title><meta name="robots" content="noindex, nofollow">',
      banner(note, { href: '/?edit=' + draft.id, text: 'Изменить' }));
  }],

  // предпросмотр без сохранения: форма генератора отправляет сюда поля (POST, открывается в новой вкладке)
  ['POST', '/preview', async (req, res) => {
    const body = Object.fromEntries(new URLSearchParams((await readRaw(req, 1e5)).toString('utf8')));
    const tid = Number(body.template_id);
    if (!Number.isInteger(tid) || tid <= 0) throw new HttpError(400, 'Выберите шаблон');
    const page = await renderTemplate(tid, { fields: body });
    if (!page) return html(res, notFoundPage(), 404);
    invitePage(res, { mode: 'preview', ...page }, '<title>Предпросмотр</title><meta name="robots" content="noindex, nofollow">',
      banner('Предпросмотр — приглашение не сохранено', null));
  }],

  ['GET', '/admin', (req, res) => html(res, read('admin.html'))],

  ['GET', '/i/:id/album', async (req, res, { params }) => {
    const x = await lookup(INVITATIONS_API, `/api/invitations/${encodeURIComponent(params.id)}`);
    if (!x) return html(res, notFoundPage(), 404);
    const tpl = await tryApi(CATALOG_API, `/api/templates/${x.template_id}`, {});
    const lang = tpl.lang || config.defaultLang;
    html(res, read('album.html')
      .replace('<!--HEAD-->', seo.albumHead({ config, lang, url: abs(`/i/${x.id}/album`) }))
      .replace('<!--DATA-->', jsonScript('__ALBUM__', { lang, api: `/api/i/${x.id}/album`, invite: `/i/${x.id}` })));
  }],

  // пример шаблона: ?shot — снимок для каталога, ?raw — шаблон как есть, с метками.
  // Индексируется только чистый адрес /t/<id>: ?raw и ?shot — noindex без canonical (и закрыты в robots.txt),
  // прочие параметры (utm, fbclid, igsh…) склеивает canonical; с лишним слешем или нулями — 301.
  ['GET', '/t/:id', async (req, res, { params, url }) => {
    const raw = url.searchParams.has('raw'), shot = url.searchParams.has('shot');
    const [info, page] = await Promise.all([
      lookup(CATALOG_API, `/api/templates/${encodeURIComponent(params.id)}`),
      renderTemplate(encodeURIComponent(params.id), raw ? { raw: true } : { sample: true }),
    ]);
    if (!info || !page) return html(res, notFoundPage(), 404);
    if (params.id !== String(info.id) || url.pathname.endsWith('/')) return send(res, 301, 'text/plain; charset=utf-8', '', { Location: `/t/${info.id}${url.search}` });
    const data = { mode: shot ? 'shot' : 'preview', ...page };
    const tpl = { id: info.id, category: info.category, lang: info.lang, price: info.price, currency: info.currency, features: featuresOf(page) };
    let head = seo.templateHead({ config, tpl, fields: info.sample, url: abs(`/t/${info.id}`), image: ogImage(info.id), analytics: !(raw || shot) });
    if (raw || shot) head = head.replace(/<meta name="robots"[^>]*>/g, '').replace(/<link rel="canonical"[^>]*>/, '') + '<meta name="robots" content="noindex">';
    // видимый текст страницы: полоса с кнопкой и блок под приглашением (не для снимков и не для ?raw)
    const extras = raw || shot ? null : seo.templateExtras({ config, tpl, fields: info.sample, catalog: await catalog() });
    invitePage(res, data, head + (extras ? '<link rel="stylesheet" href="/tbar.css">' : ''), extras ? extras.top : '', extras ? extras.bottom : '');
  }],

  ['GET', '/robots.txt', (req, res) => send(res, 200, 'text/plain; charset=utf-8', seo.robots({ config }))],
  ['GET', '/sitemap.xml', async (req, res) => send(res, 200, 'application/xml; charset=utf-8', seo.sitemap({ config, catalog: await catalog() }))],
], {
  // статика public/, затем посадочные страницы SEO
  fallback: async (req, res, { url }) => {
    const p = decodeURIComponent(url.pathname);
    if (INDEXNOW_KEY && p === `/${INDEXNOW_KEY}.txt`) return send(res, 200, 'text/plain; charset=utf-8', INDEXNOW_KEY);
    const f = /\.[a-z0-9]{2,5}$/i.test(p) && !p.endsWith('.html') && inside(PUBLIC, p.slice(1));
    if (f && fs.existsSync(f)) {
      // с актуальной версией в адресе — на год; картинки и иконки — на день; остальное браузер проверяет по ETag (304)
      const v = url.searchParams.get('v');
      const cache = v && ASSETS[p] === v ? 'immutable' : p.startsWith('/vendor/') ? 'long' : /\.(png|ico|svg|webp|jpe?g)$/i.test(p) ? 'day' : false;
      return sendFile(req, res, f, { cache });
    }
    // посадочные: один канонический адрес — строчные буквы и завершающий слеш, остальное 301;
    // всё, что не похоже на посадочную, — 404 сразу (без обращения к каталогу)
    const m = /^\/(kz|ru)(?:\/([a-z0-9-]+))?\/?$/i.exec(p);
    if (!m) return html(res, notFoundPage(), 404);
    const canon = p.toLowerCase().replace(/\/?$/, '/');
    if (canon !== p) return send(res, 301, 'text/plain; charset=utf-8', '', { Location: canon + url.search });
    const page = seo.page({ config, catalog: await catalog(), path: p, lang: m[1] });
    if (page && page.html) return html(res, page.html);
    html(res, notFoundPage(), 404);
  },
});

function notPublishedPage() {
  return `<!doctype html><html lang="kk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Шақыру әлі жарияланбаған</title><meta name="robots" content="noindex">
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;font:16px/1.5 system-ui,sans-serif;background:#f6f3ee;color:#2b2620;text-align:center;padding:24px}a{color:#8c6a3f}</style></head>
<body><div><h1 style="font-weight:600">Шақыру әлі жарияланбаған<br>Приглашение ещё не опубликовано</h1><p>Если это ваше приглашение — <a href="/">войдите</a>.</p></div></body></html>`;
}

function notFoundPage() {
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Страница не найдена</title><meta name="robots" content="noindex">
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;font:16px/1.5 system-ui,sans-serif;background:#f6f3ee;color:#2b2620;text-align:center;padding:24px}a{color:#8c6a3f}</style></head>
<body><div><h1 style="font-weight:600">Бет табылмады · Страница не найдена</h1><p><a href="/">На главную</a></p></div></body></html>`;
}
