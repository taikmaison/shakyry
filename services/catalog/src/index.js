// Сервис каталога: шаблоны, сборка приглашения из шаблона, музыка, медиа, шрифты, превью.
// Ни о каких других сервисах не знает. Данные — папка content/ (только чтение).
const fs = require('fs');
const path = require('path');
const { env, json, send, notFound, readJson, sendFile, inside, HttpError, createService, TYPES } = require('../lib/http');
const T = require('./templates');

const CONTENT = path.resolve(env('CONTENT_DIR', path.join(__dirname, '..', 'content')));
let catalog = [];
const cache = new Map();
// цена шаблона: PRICE — для всех (в тенге), content/prices.json { "<id>": цена } — исключения
const PRICE = Number(env('PRICE', 3500)), CURRENCY = env('CURRENCY', 'KZT');
let prices = {};
const price = id => { const p = Number(prices[id]); return Number.isFinite(p) && p >= 0 ? p : PRICE; };
let music = null, extraMusic = [];
// своя музыка сверх песен из шаблонов: content/music.json { "tracks": [{ "url": "/media/ab/….mp3", "title": "Исполнитель — Песня" }] }
// (приходит вместе с файлами отдельным архивом, см. tools/fetch-content.js --extra: песни не кладём в публичный git)
const MUSIC_URL = /^\/media\/[0-9a-f]{2}\/[0-9a-f]+\.(mp3|m4a|ogg|wav)$/i;   // как проверяет поле music в templates.js
// исправления шаблонов и шрифтов храним в git (content/ — архив из Google Drive, его не правим):
//   fixes/templates.json — { templates: { "<id>": [{ id | type, text?, set: { "data.mainColor": "#fff", "size.height": 400 } }] } }
//   fixes/fonts.css      — дописывается к content/fonts.css (казахские буквы из шрифтов, где они нарисованы неверно)
//   fixes/custom.json    — заказные копии шаблонов: { templates: { "<новый id>": { base: 150, set: [ …как в templates.json… ] } } };
//                          в каталоге не видны, открываются по номеру; картинки — только из content/media
const FIXES = path.join(__dirname, '..', 'fixes');
let fixes = {}, custom = {};

function load() {
  const f = path.join(CONTENT, 'templates.json');
  catalog = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : [];
  const pf = path.join(CONTENT, 'prices.json');
  prices = fs.existsSync(pf) ? JSON.parse(fs.readFileSync(pf, 'utf8')) : {};
  const ff = path.join(FIXES, 'templates.json');
  fixes = fs.existsSync(ff) ? JSON.parse(fs.readFileSync(ff, 'utf8')).templates || {} : {};
  const cf = path.join(FIXES, 'custom.json');
  custom = fs.existsSync(cf) ? JSON.parse(fs.readFileSync(cf, 'utf8')).templates || {} : {};
  const mf = path.join(CONTENT, 'music.json');
  extraMusic = fs.existsSync(mf) ? JSON.parse(fs.readFileSync(mf, 'utf8')).tracks || [] : [];
  cache.clear();
  music = null;
  console.log(`[catalog] шаблонов: ${catalog.length}`);
}
function template(id) {
  id = Number(id);
  if (!Number.isInteger(id)) return null;
  if (!cache.has(id)) {
    const own = custom[id];
    if (own) {
      const base = own.base !== id && template(own.base);
      if (!base) return null;
      cache.set(id, patch({ ...structuredClone(base), id }, own.set || []));
    } else {
      const f = path.join(CONTENT, 'templates', `${id}.json`);
      if (!fs.existsSync(f)) return null;
      cache.set(id, patch(JSON.parse(fs.readFileSync(f, 'utf8'))));
    }
  }
  return cache.get(id);
}
// компонент выбирается по id или по типу (+ точному тексту); set — значения по путям «data.x», «position.y»…
function patch(tpl, list = fixes[tpl.id] || []) {
  for (const f of list) {
    let hit = 0;
    for (const b of tpl.blocks || []) for (const c of b.components || []) {
      if (f.id ? c.id !== f.id : c.type !== f.type) continue;
      if (f.text != null && String((c.data && (c.data.text ?? c.data.content)) || '').trim() !== f.text) continue;
      for (const [k, v] of Object.entries(f.set || {})) {
        const keys = k.split('.');
        let o = c;
        for (const key of keys.slice(0, -1)) o = o[key] ??= {};
        o[keys.at(-1)] = v;
      }
      hit++;
    }
    if (!hit) console.warn(`[catalog] исправление шаблона #${tpl.id} ни к чему не подошло: ${JSON.stringify(f)}`);
  }
  return tpl;
}
const need = id => { const t = template(id); if (!t) throw new HttpError(404, 'Шаблон не найден'); return t; };
const preview = id => fs.existsSync(path.join(CONTENT, 'previews', `${id}.webp`)) ? `/previews/${id}.webp` : null;

// названия треков из тегов mp3 (если есть)
function mp3Title(file) {
  try {
    const b = fs.readFileSync(file).subarray(0, 65536);
    if (b.toString('latin1', 0, 3) !== 'ID3') return null;
    const ver = b[3];
    const size = (b[6] << 21) | (b[7] << 14) | (b[8] << 7) | b[9];
    const tags = {};
    for (let pos = 10; pos + 10 < Math.min(10 + size, b.length);) {
      const id = b.toString('latin1', pos, pos + 4);
      if (!/^[A-Z0-9]{4}$/.test(id)) break;
      const len = ver >= 4 ? (b[pos + 4] << 21) | (b[pos + 5] << 14) | (b[pos + 6] << 7) | b[pos + 7] : b.readUInt32BE(pos + 4);
      if (id === 'TIT2' || id === 'TPE1') {
        let data = b.subarray(pos + 11, pos + 10 + len);
        const enc = b[pos + 10];
        let s;
        if (enc === 1 || enc === 2) {
          const be = enc === 2 || (data[0] === 0xfe && data[1] === 0xff);
          if ((data[0] === 0xff && data[1] === 0xfe) || (data[0] === 0xfe && data[1] === 0xff)) data = data.subarray(2);
          s = new TextDecoder(be ? 'utf-16be' : 'utf-16le').decode(data);
        } else if (enc === 3) s = data.toString('utf8');
        else s = new TextDecoder(data.some(x => x >= 0xc0) ? 'windows-1251' : 'latin1').decode(data);   // старые теги часто в cp1251
        // теги, когда-то перекодированные из cp1251 как latin1 («Øîïåí» вместо «Шопен»), — обратно
        if (/[À-ÿ]{3}/.test(s) && !/[Ѐ-ӿ]/.test(s) && [...s].every(ch => ch.charCodeAt(0) < 256))
          s = new TextDecoder('windows-1251').decode(Buffer.from(s, 'latin1'));
        tags[id] = s.replace(/\u0000|﻿|￾/g, '').replace(/\s*[\[(](sefon|muzzonas|lmusic|agugai|kztrack|muzdown)[^\])]*[\])]/ig, '').trim();
      }
      pos += 10 + len;
    }
    return [tags.TPE1, tags.TIT2].filter(Boolean).join(' — ') || null;
  } catch { return null; }
}
function musicLibrary() {
  if (music) return music;
  const set = new Set();
  for (const t of catalog) { const tpl = template(t.id); if (tpl) T.templateMusic(tpl).forEach(u => set.add(u)); }
  const own = extraMusic.filter(t => t && MUSIC_URL.test(t.url) && fs.existsSync(path.join(CONTENT, t.url)))
    .map(t => ({ url: t.url, title: String(t.title || '').trim() || mp3Title(path.join(CONTENT, t.url)) || 'Әуен' }));
  const ownUrls = new Set(own.map(t => t.url));
  // своя музыка — первой; номер «Әуен N» у песен из шаблонов не меняется
  music = own.concat([...set].filter(u => fs.existsSync(path.join(CONTENT, u))).map((url, i) => ({ url, title: mp3Title(path.join(CONTENT, url)) || `Әуен ${i + 1}` })).filter(t => !ownUrls.has(t.url)));
  return music;
}

load();
// Vercel-CDN-Cache-Control понимает только CDN Vercel (его кеш сбрасывается при деплое, content/ внутри образа);
// на VPS заголовок ни на что не влияет, браузеру — Cache-Control из sendFile
const file = (req, res, f, cache) => {
  if (!f) return notFound(res);
  if (fs.statSync(f, { throwIfNoEntry: false })?.isFile()) res.setHeader('Vercel-CDN-Cache-Control', 'public, max-age=31536000, immutable');
  return sendFile(req, res, f, { cache });
};
const files = (dir, cache) => (req, res, { params }) => file(req, res, inside(path.join(CONTENT, dir), params.rest), cache);

createService('catalog', [
  ['GET', '/api/templates', (req, res) => json(res, 200, catalog.map(t => ({ ...t, preview: preview(t.id), price: price(t.id), currency: CURRENCY })))],

  ['GET', '/api/templates/:id', (req, res, { params }) => {
    const tpl = need(params.id);
    json(res, 200, { id: tpl.id, category: tpl.category, lang: tpl.lang, tokens: T.tokensOf(tpl), sample: T.sampleFields(tpl), music: T.templateMusic(tpl), preview: preview(tpl.id), price: price(tpl.id), currency: CURRENCY });
  }],

  // собрать приглашение: { fields } → данные для страницы; { sample: true } — с примером; { raw: true } — как есть
  ['POST', '/api/templates/:id/render', async (req, res, { params }) => {
    const tpl = need(params.id);
    const b = await readJson(req);
    json(res, 200, T.render(tpl, b.sample ? T.sampleFields(tpl) : b.fields || {}, { raw: !!b.raw }));
  }],

  ['GET', '/api/music', (req, res) => json(res, 200, musicLibrary())],
  ['GET', '/fonts.css', (req, res) => {
    const f = path.join(CONTENT, 'fonts.css'), fix = path.join(FIXES, 'fonts.css');
    if (!fs.existsSync(f)) return notFound(res);
    const body = fs.readFileSync(f, 'utf8') + (fs.existsSync(fix) ? '\n' + fs.readFileSync(fix, 'utf8') : '');
    send(res, 200, TYPES['.css'], body, { 'Cache-Control': 'public, max-age=604800', 'Vercel-CDN-Cache-Control': 'public, max-age=31536000, immutable' });
  }],
  ['GET', '/media/*', files('media', true)],
  ['GET', '/fonts/*', files('fonts', true)],
  ['GET', '/previews/*', files('previews', false)],
  // перечитать content/ после обновления шаблонов (шлюз /_internal наружу не пускает)
  ['POST', '/_internal/reload', (req, res) => { load(); json(res, 200, { templates: catalog.length }); }],
]);
