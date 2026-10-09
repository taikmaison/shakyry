// Сервис веб-страниц: генератор, страницы приглашений и примеров, альбом, SEO, статика public/.
// Данные берёт только через API каталога и приглашений (адреса — из окружения).
const fs = require('fs');
const path = require('path');
const { env, html, send, sendFile, inside, readRaw, api, tryApi, HttpError, createService } = require('../lib/http');
const seo = require('./seo');

const CATALOG_API = env('CATALOG_API');
const INVITATIONS_API = env('INVITATIONS_API');
const config = {
  siteName: env('SITE_NAME', 'Шақыру'),
  siteUrl: env('PUBLIC_URL', 'http://127.0.0.1:8024').replace(/\/+$/, ''),
  defaultLang: env('DEFAULT_LANG', 'kz'),
  whatsapp: env('CONTACT_WHATSAPP', '').replace(/\D/g, ''),
  payment: env('PAYMENT_DETAILS', '').trim().slice(0, 200),   // как оплатить, напр. «Kaspi Gold +7 … (Имя Ф.)»; пусто — уточняют в WhatsApp   // для заказа индивидуального дизайна, напр. 77780122500
};
const PUBLIC = path.resolve(env('PUBLIC_DIR', path.join(__dirname, '..', 'public')));
const read = f => fs.readFileSync(path.join(PUBLIC, f), 'utf8');
const abs = p => config.siteUrl + p;
const jsonScript = (name, data) => `<script>window.${name}=${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
const ogImage = id => abs(`/previews/${id}.jpg`);
const htmlLang = l => (l === 'ru' ? 'ru' : 'kk');

// каталог нужен для главной, sitemap и посадочных — держим копию минуту
let catalogCache = { at: 0, list: [] };
async function catalog() {
  if (Date.now() - catalogCache.at > 60e3) {
    try { catalogCache = { at: Date.now(), list: await lookup(CATALOG_API, '/api/templates') || [] }; }
    catch { catalogCache.at = Date.now() - 55e3; }   // сервис просыпается — прежний список, повтор через 5 с
  }
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

function invitePage(res, data, head, top = '') {
  let page = read('invite.html');
  const usesLottie = data.blocks.some(b => (b.components || []).some(c => c.type === 'lottie'));
  if (!usesLottie) page = page.replace(/<script src="\/vendor\/lottie_light\.min\.js"><\/script>\r?\n/, '');
  html(res, page.replace('<!--HEAD-->', head).replace('<!--DATA-->', top + jsonScript('__INVITE__', data)).replace('<html lang="kk">', `<html lang="${htmlLang(data.lang)}">`));
}

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
  ['GET', '/', async (req, res) => html(res, read('index.html').replace('<!--HEAD-->', seo.homeHead({ config, catalog: await catalog() }) + jsonScript('__SITE__', { whatsapp: config.whatsapp, payment: config.payment })))],

  // приглашение: гостям — одобренная версия; владельцу с ?draft или без одобренной версии — текущая, с плашкой
  ['GET', '/i/:id', async (req, res, { params, url }) => {
    const id = encodeURIComponent(params.id);
    const live = url.searchParams.has('draft') ? null : await lookup(INVITATIONS_API, `/api/invitations/${id}`);
    if (live) {
      const page = await renderTemplate(live.template_id, { fields: live.fields });
      if (!page) return send(res, 410, 'text/plain; charset=utf-8', 'Шаблон этого приглашения больше недоступен');
      const data = { mode: 'invite', id: live.id, ...page, api: { rsvp: `/api/i/${live.id}/rsvp`, wishes: `/api/i/${live.id}/wishes`, album: `/i/${live.id}/album` } };
      return invitePage(res, data, seo.inviteHead({ config, data, url: abs(`/i/${live.id}`), image: ogImage(live.template_id) }));
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

  // пример шаблона: ?shot — снимок для каталога, ?raw — шаблон как есть, с метками
  ['GET', '/t/:id', async (req, res, { params, url }) => {
    const raw = url.searchParams.has('raw');
    const [info, page] = await Promise.all([
      lookup(CATALOG_API, `/api/templates/${encodeURIComponent(params.id)}`),
      renderTemplate(encodeURIComponent(params.id), raw ? { raw: true } : { sample: true }),
    ]);
    if (!info || !page) return html(res, notFoundPage(), 404);
    const data = { mode: url.searchParams.has('shot') ? 'shot' : 'preview', ...page };
    let head = seo.templateHead({ config, tpl: { id: info.id, category: info.category, lang: info.lang, price: info.price, currency: info.currency }, fields: info.sample, url: abs(`/t/${info.id}`), image: ogImage(info.id) });
    if (raw) head = head.replace(/<meta name="robots"[^>]*>/g, '') + '<meta name="robots" content="noindex">';
    invitePage(res, data, head);
  }],

  ['GET', '/robots.txt', (req, res) => send(res, 200, 'text/plain; charset=utf-8', seo.robots({ config }))],
  ['GET', '/sitemap.xml', async (req, res) => send(res, 200, 'application/xml; charset=utf-8', seo.sitemap({ config, catalog: await catalog() }))],
], {
  // статика public/, затем посадочные страницы SEO
  fallback: async (req, res, { url }) => {
    const p = decodeURIComponent(url.pathname);
    const f = /\.[a-z0-9]{2,5}$/i.test(p) && !p.endsWith('.html') && inside(PUBLIC, p.slice(1));
    if (f && fs.existsSync(f)) return sendFile(req, res, f, { cache: p.startsWith('/vendor/') });
    const lang = (p.match(/^\/(kz|ru)(\/|$)/) || [])[1] || null;
    const page = seo.page({ config, catalog: await catalog(), path: p, lang });
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
