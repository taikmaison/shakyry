// Обновление шаблонов: данные из открытого API + картинки, музыка и видео.
// Никакого чужого кода и страниц — только JSON шаблона и медиафайлы.
//
//   node tools/update.js                    — все шаблоны (kz, ru)
//   node tools/update.js --only=296,310     — только эти
//   node tools/update.js --mirror=<папка>   — брать файлы из старой копии, если они там есть
//
// Результат: content/templates.json (каталог), content/templates/<id>.json, content/media/

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const API = 'https://shaqyru24api.com';
const LANGS = ['kz', 'ru'];
const MEDIA_HOSTS = new Set(['shaqyru24api.com', 'shaqyru.kz', 'tyrasoft.kz', 'dl.dropbox.com', 'dl.dropboxusercontent.com']);
const ROOT = path.join(__dirname, '..');
const CONTENT = path.join(ROOT, 'content');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36';

const args = Object.fromEntries(process.argv.slice(2).map(a => a.replace(/^--/, '').split('=')));
const only = args.only ? new Set(args.only.split(',').map(Number)) : null;
const mirror = args.mirror ? path.resolve(args.mirror) : null;
const mirrorIndex = mirror ? JSON.parse(fs.readFileSync(path.join(mirror, 'index.json'), 'utf8')) : {};

fs.mkdirSync(path.join(CONTENT, 'templates'), { recursive: true });
fs.mkdirSync(path.join(CONTENT, 'media'), { recursive: true });

async function getJson(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

async function pool(items, n, fn) {
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) await fn(items[i++]); }));
}

// видео, которое показывается в видеоблоке шаблона без своего файла
const DEFAULT_VIDEO = 'https://shaqyru24.kz/videos/video_bg.webm';

// ---------- медиа ----------
function mediaUrl(s) {
  if (typeof s !== 'string') return null;
  // мусор после имени файла («…mp3 #8d0c0c» — сюда попал цвет из соседнего поля)
  s = s.replace(/(\.(?:mp3|mp4|webm|mov|webp|png|jpe?g|gif|svg|json))(?:%20|\s)+#?[0-9a-f]{3,8}$/i, '$1');
  if (s.startsWith('/uploads/')) return API + s;
  try {
    const u = new URL(s);
    if (u.href === DEFAULT_VIDEO) return u.href;
    return MEDIA_HOSTS.has(u.hostname) ? u.href : null;
  } catch { return null; }
}

function localName(url) {
  const ext = (path.extname(new URL(url).pathname).toLowerCase().match(/^\.[a-z0-9]{2,5}$/) || ['.bin'])[0];
  const h = crypto.createHash('sha1').update(url).digest('hex');
  return `${h.slice(0, 2)}/${h.slice(2, 16)}${ext}`;
}

const pending = new Map();   // url → локальное имя
const used = new Set();      // локальные имена, на которые ссылаются шаблоны после очистки
const missing = [];

async function fetchMedia(url, name) {
  const dest = path.join(CONTENT, 'media', name);
  if (fs.existsSync(dest)) return;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const rec = mirrorIndex['GET ' + url];
  if (rec && rec.s === 200) return fs.copyFileSync(path.join(mirror, rec.f), dest);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow' });
    if (!res.ok) return missing.push(`${res.status} ${url}`);
    fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
  } catch (e) { missing.push(`ERR ${url} ${e.message}`); }
}

// заменить ссылки на медиа локальными путями /media/...
function localize(o) {
  if (Array.isArray(o)) return o.map(localize);
  if (o && typeof o === 'object') return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, localize(v)]));
  const url = mediaUrl(o);
  if (!url) return o;
  const name = localName(url);
  pending.set(url, name);
  return '/media/' + name;
}

// ---------- шаблоны ----------
(async () => {
  const list = [];
  for (const lang of LANGS) {
    const r = await getJson(`${API}/api/v2/page-builder/templates/list?skip=0&limit=500&main_category=toi&lang=${lang}&sort_by=total_sold`);
    for (const t of r.templates || [])
      if (!list.find(x => x.template_id === t.template_id) && (!only || only.has(t.template_id))) list.push(t);
  }
  console.log(`Шаблонов: ${list.length}`);

  const catalog = [];
  let done = 0;
  await pool(list, 8, async t => {
    try {
      const page = await getJson(`${API}/api/v2/page-builder/public/${t.page_id}`);
      const env = await getJson(`${API}/api/v2/page-builder/page/options/check?page_id=${t.page_id}&option_name=envelope`).catch(() => null);
      const block = page.blocks && page.blocks[0];
      if (!block) throw new Error('пустой шаблон');
      for (const b of page.blocks) for (const c of b.components || [])
        if (c.type === 'video' && !(c.data && c.data.src)) c.data = { ...(c.data || {}), src: DEFAULT_VIDEO, loop: true, objectFit: 'cover' };
      const tpl = {
        id: t.template_id,
        category: t.category,
        lang: t.lang,
        updated_at: page.updated_at || null,
        envelope: env && env.exists ? localize({
          theme: env.theme, lang: env.lang,
          color: env.custom_envelope_color, text_color: env.custom_text_color,
          background: env.background_image_url, button_image: env.button_image_url,
        }) : null,
        blocks: localize(page.blocks.map(b => ({ type: b.type, style: b.style, components: b.components }))),
      };
      require('./clean').clean(tpl);   // чужая реклама, контакты, alt, мусор за краем холста, blocklist
      const text = JSON.stringify(tpl);
      // качаем только то, что осталось в шаблоне после очистки
      for (const m of text.matchAll(/\/media\/([0-9a-f]{2}\/[0-9a-f]+\.\w+)/g)) used.add(m[1]);
      fs.writeFileSync(path.join(CONTENT, 'templates', `${t.template_id}.json`), text);
      catalog.push({ id: t.template_id, category: t.category, lang: t.lang, popularity: t.total_sold || 0 });
    } catch (e) {
      console.log('  шаблон', t.template_id, e.message);
    }
    if (++done % 50 === 0) console.log(`  ${done}/${list.length}`);
  });

  // каталог: при частичном обновлении дополняем существующий
  const catFile = path.join(CONTENT, 'templates.json');
  const old = only && fs.existsSync(catFile) ? JSON.parse(fs.readFileSync(catFile, 'utf8')) : [];
  const merged = [...old.filter(x => !catalog.find(c => c.id === x.id)), ...catalog].sort((a, b) => b.popularity - a.popularity);
  fs.writeFileSync(catFile, JSON.stringify(merged, null, 1));

  const queue = [...pending].filter(([, name]) => used.has(name));
  console.log(`Медиафайлов: ${queue.length}`);
  let n = 0;
  await pool(queue, 8, async ([url, name]) => { await fetchMedia(url, name); if (++n % 200 === 0) console.log(`  ${n}/${queue.length}`); });
  console.log(`Готово. Шаблонов: ${merged.length}. Недоступных файлов (нет и на их сервере): ${missing.length}`);
  if (missing.length) fs.writeFileSync(path.join(CONTENT, 'missing-media.txt'), missing.join('\n'));
  // если сервисы запущены — каталог перечитает шаблоны без перезапуска
  const catalogUrl = process.env.CATALOG_URL || 'http://127.0.0.1:8031';
  await fetch(catalogUrl + '/_internal/reload', { method: 'POST' }).then(() => console.log('Каталог обновлён в работающем сервисе.')).catch(() => {});
  console.log('Новые шаблоны без превью: node tools/previews.js <id>');
})();
