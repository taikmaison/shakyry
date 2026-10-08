// Сервис каталога: шаблоны, сборка приглашения из шаблона, музыка, медиа, шрифты, превью.
// Ни о каких других сервисах не знает. Данные — папка content/ (только чтение).
const fs = require('fs');
const path = require('path');
const { env, json, send, notFound, readJson, sendFile, inside, HttpError, createService } = require('../lib/http');
const T = require('./templates');

const CONTENT = path.resolve(env('CONTENT_DIR', path.join(__dirname, '..', 'content')));
let catalog = [];
const cache = new Map();
// цена шаблона: PRICE — для всех (в тенге), content/prices.json { "<id>": цена } — исключения
const PRICE = Number(env('PRICE', 3500)), CURRENCY = env('CURRENCY', 'KZT');
let prices = {};
const price = id => { const p = Number(prices[id]); return Number.isFinite(p) && p >= 0 ? p : PRICE; };
let music = null;

function load() {
  const f = path.join(CONTENT, 'templates.json');
  catalog = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : [];
  const pf = path.join(CONTENT, 'prices.json');
  prices = fs.existsSync(pf) ? JSON.parse(fs.readFileSync(pf, 'utf8')) : {};
  cache.clear();
  music = null;
  console.log(`[catalog] шаблонов: ${catalog.length}`);
}
function template(id) {
  id = Number(id);
  if (!Number.isInteger(id)) return null;
  if (!cache.has(id)) {
    const f = path.join(CONTENT, 'templates', `${id}.json`);
    if (!fs.existsSync(f)) return null;
    cache.set(id, JSON.parse(fs.readFileSync(f, 'utf8')));
  }
  return cache.get(id);
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
  music = [...set].filter(u => fs.existsSync(path.join(CONTENT, u))).map((url, i) => ({ url, title: mp3Title(path.join(CONTENT, url)) || `Әуен ${i + 1}` }));
  return music;
}

load();
const files = (dir, cache) => (req, res, { params }) => {
  const f = inside(path.join(CONTENT, dir), params.rest);
  return f ? sendFile(req, res, f, { cache }) : notFound(res);
};

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
  ['GET', '/fonts.css', (req, res) => sendFile(req, res, path.join(CONTENT, 'fonts.css'), { cache: true })],
  ['GET', '/media/*', files('media', true)],
  ['GET', '/fonts/*', files('fonts', true)],
  ['GET', '/previews/*', files('previews', false)],
  // перечитать content/ после обновления шаблонов (шлюз /_internal наружу не пускает)
  ['POST', '/_internal/reload', (req, res) => { load(); json(res, 200, { templates: catalog.length }); }],
]);
