// Очистка шаблонов от чужой рекламы, контактов и мусора дизайнера.
//
//   node tools/clean.js                 — почистить все content/templates/*.json и напечатать отчёт
//   node tools/clean.js --dry           — только отчёт, файлы не менять
//   node tools/clean.js --prune-media   — после очистки удалить из content/media файлы, на которые никто не ссылается
//
// В коде: const { clean } = require('./clean'); clean(tpl) → { template, removed, warnings }
// (шаблон меняется на месте и возвращается тот же объект — так update.js достаточно одного вызова).
//
// Что делает clean():
//   1. убирает data.alt у всех компонентов (там исходные имена файлов: телефоны, ники, «WhatsApp_Image…»);
//   2. ищет телефоны, e-mail, @ники, ссылки на соцсети/мессенджеры и названия других сервисов приглашений
//      во всех строках, кроме ссылок на медиа. В служебных полях найденное вырезается,
//      видимый текст НЕ меняется — он попадает в warnings, чтобы человек решил сам;
//   3. удаляет компоненты, которые целиком лежат за краем холста (ширина 430px, высота блока)
//      — их всё равно не видно, это «склад» дизайнера. Компоненты с motionPath не трогаем:
//      они специально стартуют за краем и пролетают через экран;
//   4. удаляет компоненты (или их отдельные фото/поля), чьи медиа есть в content/blocklist.json.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CONTENT = path.join(ROOT, 'content');
const BLOCKLIST_FILE = path.join(CONTENT, 'blocklist.json');

const CANVAS_W = 430;                                      // холст: min(100vw, 430px)
const FIXED = new Set(['audio-fixed', 'fixed-wishes']);    // эти рисуются панелью внизу экрана, координаты не важны
const MEDIA_RX = /\/media\/[0-9a-f]{2}\/[0-9a-f]+\.[a-z0-9]+/gi;

// ---------- что ищем в строках ----------
const PATTERNS = [
  ['телефон', /(?<![\w\d])(?:\+?[78])[\s\-()]*\d{3}[\s\-()]*\d{3}[\s\-]*\d{2}[\s\-]*\d{2}(?!\d)|(?<![\w\d])\+\d[\d\s\-()]{9,16}\d/g],
  ['e-mail', /[\w.+-]+@[\w-]+(?:\.[\w-]+)*\.[a-z]{2,}/gi],
  ['ник', /(?<=^|[^\w@./])@(?!lottiefiles\b)[A-Za-z0-9_][A-Za-z0-9_.]{2,}/g],
  ['соцсеть', /(?:https?:\/\/)?(?:www\.)?(?:instagram\.com|instagr\.am|wa\.me|api\.whatsapp\.com|t\.me|telegram\.me|tiktok\.com|vk\.com|facebook\.com|fb\.com|youtube\.com|youtu\.be)\/?[^\s"'<>]*|\b(?:instagram|insta|whatsapp|telegram|tiktok)\b|инстаграм|инста\b|ватсап|вотсап|уатсап|телеграм|тикток/gi],
  ['бренд', /shaqyru(?:24)?(?:api)?(?:\.kz|\.com)?|shakyru|шақыру\s*-?\s*24|шакыру\s*-?\s*24|aqbosaga|ақбосаға|акбосага|toitrend|той\s*тренд|tyrasoft|тайрасофт|invitee\.kz|weddy\.kz|toi\.kz|shaqyrtu\.kz|taklifnoma\.uz/gi],
];
// адрес с номером дома — только для отчёта (это может быть пример, но может быть и чужой реальный адрес)
const ADDRESS_RX = /(?:көшесі|даңғылы|проспект|пр-т|улица|ул\.|мкр\.?|ықшам\s*аудан)[^\n]{0,40}?\d+/i;

// ключи, где лежит видимый текст (его не меняем, только сообщаем)
const VISIBLE_KEYS = new Set(['content', 'text', 'titleText', 'event_title', 'form_title', 'form_description', 'label', 'placeholder',
  'submit_button_text', 'modal_button_text', 'modal_title', 'button_text', 'title', 'description', 'separator', 'value']);
// ключи, которые не проверяем: ссылки на медиа и адреса, идентификаторы, оформление
const SKIP_KEYS = /^(src|url|audio_url|play_icon_url|stop_icon_url|backgroundImage|backgroundVideo|background|button_image|id|form_id|gallery_id|field_name|fontFamily|font_family|.*FontFamily|.*_fontFamily)$/;

// ---------- blocklist ----------
function loadBlocklist() {
  try {
    const j = JSON.parse(fs.readFileSync(BLOCKLIST_FILE, 'utf8'));
    const list = Array.isArray(j) ? j : j.media || [];
    return new Map(list.map(x => typeof x === 'string' ? [x, ''] : [x.path, x.reason || '']));
  } catch { return new Map(); }
}
let BLOCK = loadBlocklist();
const blocked = s => typeof s === 'string' && BLOCK.has(s);

// ---------- геометрия ----------
const num = v => { const n = parseFloat(v); return Number.isFinite(n) ? n : null; };

// половины габаритов с учётом поворота из style.transform
function halfExtent(c) {
  const w = num(c.size && c.size.width) || 0, h = num(c.size && c.size.height) || 0;
  const m = /rotate\(\s*(-?[\d.]+)deg\s*\)/.exec((c.style && c.style.transform) || '');
  const a = m ? Number(m[1]) * Math.PI / 180 : 0;
  return {
    hw: (Math.abs(w * Math.cos(a)) + Math.abs(h * Math.sin(a))) / 2,
    hh: (Math.abs(w * Math.sin(a)) + Math.abs(h * Math.cos(a))) / 2,
  };
}

// компонент целиком за краем холста? (центр в точке x% ширины / y% высоты блока)
function offCanvas(c, blockHeight) {
  if (FIXED.has(c.type)) return false;
  const anim = c.data && c.data.__animation;
  if (anim && anim.motionPath) return false;
  const w = num(c.size && c.size.width), h = num(c.size && c.size.height);
  if (!w || !h) return false;                              // размер «auto» — не знаем, не трогаем
  const pos = c.position || {};
  const { hw, hh } = halfExtent(c);
  const x = (num(pos.x) ?? 50) / 100 * CANVAS_W;
  if (x + hw < 0 || x - hw > CANVAS_W) return true;
  if (blockHeight) {
    const y = (num(pos.y) ?? 0) / 100 * blockHeight;
    if (y + hh < 0 || y - hh > blockHeight) return true;
  }
  return false;
}

// ---------- обход строк ----------
function scanStrings(o, at, cb, key = '') {
  if (Array.isArray(o)) { o.forEach((v, i) => { const r = scanStrings(v, `${at}[${i}]`, cb, key); if (r !== undefined) o[i] = r; }); return; }
  if (o && typeof o === 'object') {
    for (const [k, v] of Object.entries(o)) { const r = scanStrings(v, `${at}.${k}`, cb, k); if (r !== undefined) o[k] = r; }
    return;
  }
  if (typeof o === 'string') return cb(o, at, key);
}

function findings(s) {
  const out = [];
  for (const [kind, rx] of PATTERNS) for (const m of s.matchAll(rx)) out.push({ kind, match: m[0].trim() });
  return out;
}

const short = s => (s.length > 120 ? s.slice(0, 117) + '…' : s).replace(/\s+/g, ' ');

// ---------- главная функция ----------
function clean(tpl) {
  const removed = [];
  const warnings = [];
  if (!tpl || !Array.isArray(tpl.blocks)) return { template: tpl, removed, warnings };
  let alts = 0;

  // конверт: картинку из blocklist просто убираем (останется цвет темы)
  if (tpl.envelope) for (const k of ['background', 'button_image'])
    if (blocked(tpl.envelope[k])) { removed.push({ what: 'поле', at: `envelope.${k}`, media: tpl.envelope[k], reason: BLOCK.get(tpl.envelope[k]) }); tpl.envelope[k] = null; }

  tpl.blocks.forEach((b, bi) => {
    const st = b.style || {};
    for (const k of ['backgroundImage', 'backgroundVideo'])
      if (blocked(st[k])) { removed.push({ what: 'фон блока', at: `blocks[${bi}].style.${k}`, media: st[k], reason: BLOCK.get(st[k]) }); st[k] = ''; }
    const H = num(st.height);

    b.components = (b.components || []).filter(c => {
      const d = c.data || {};
      const label = { id: c.id, type: c.type, ...(d.src ? { media: d.src } : {}), ...(typeof d.content === 'string' ? { text: short(d.content) } : {}) };

      // 4. медиа из blocklist
      if (blocked(d.src) || blocked(d.audio_url)) {
        const m = blocked(d.src) ? d.src : d.audio_url;
        removed.push({ what: 'компонент', ...label, media: m, reason: 'blocklist: ' + BLOCK.get(m) });
        return false;
      }
      for (const k of ['play_icon_url', 'stop_icon_url'])
        if (blocked(d[k])) { removed.push({ what: 'поле', at: `${c.id}.data.${k}`, media: d[k], reason: 'blocklist: ' + BLOCK.get(d[k]) }); delete d[k]; }
      if (Array.isArray(d.gallery_photos)) {
        const keep = d.gallery_photos.filter(p => !(p && blocked(p.url)));
        if (keep.length !== d.gallery_photos.length) {
          for (const p of d.gallery_photos) if (p && blocked(p.url)) removed.push({ what: 'фото галереи', id: c.id, type: c.type, media: p.url, reason: 'blocklist: ' + BLOCK.get(p.url) });
          d.gallery_photos = keep;
          if (!keep.length) { removed.push({ what: 'компонент', ...label, reason: 'в галерее не осталось фото' }); return false; }
        }
      }

      // 3. мусор за краем холста
      if (offCanvas(c, H)) {
        removed.push({ what: 'компонент', ...label, reason: `за краем холста (x=${Math.round(num(c.position.x))}%, y=${Math.round(num(c.position.y))}%, ${c.size.width}×${c.size.height})` });
        return false;
      }

      // 1. alt — исходные имена файлов
      if ('alt' in d) { delete d.alt; alts++; }
      return true;
    });

    // 2. контакты и бренды в строках
    b.components.forEach(c => {
      scanStrings(c, c.id, (s, at, key) => {
        if (SKIP_KEYS.test(key) || /^\/media\//.test(s) || /^data:/.test(s)) return;
        const f = findings(s);
        if (VISIBLE_KEYS.has(key) && !at.includes('.animationData')) {
          for (const x of f) warnings.push({ at, kind: x.kind, match: x.match, text: short(s) });
          if (ADDRESS_RX.test(s)) warnings.push({ at, kind: 'адрес', match: ADDRESS_RX.exec(s)[0], text: short(s) });
          return;
        }
        if (!f.length) return;
        let v = s;
        for (const x of f) v = v.split(x.match).join('');
        v = v.replace(/\s{2,}/g, ' ').trim();
        removed.push({ what: 'служебный текст', at, kind: f.map(x => x.kind).join(', '), was: short(s), now: v });
        return v;
      });
      // ссылки кнопок: не меняем (это поле заполняет пользователь), но соцсети и чужие сервисы — в отчёт
      const u = c.data && c.data.url;
      if (typeof u === 'string') for (const x of findings(u)) if (x.kind === 'соцсеть' || x.kind === 'бренд') warnings.push({ at: `${c.id}.data.url`, kind: x.kind, match: x.match, text: u });
    });
  });

  if (alts) removed.push({ what: 'alt', count: alts, reason: 'исходные имена файлов (телефоны, ники)' });
  return { template: tpl, removed, warnings };
}

// ---------- медиа, на которые никто не ссылается ----------
function referencedMedia() {
  const refs = new Set();
  const add = s => { for (const m of s.match(MEDIA_RX) || []) refs.add(m); };
  const dir = path.join(CONTENT, 'templates');
  for (const f of fs.readdirSync(dir)) if (f.endsWith('.json')) add(fs.readFileSync(path.join(dir, f), 'utf8'));   // вместе с envelope
  // готовые приглашения могут ссылаться на музыку из шаблонов (поле music) — их файлы не трогаем
  const data = path.join(ROOT, 'data');
  (function walk(d) {
    if (!fs.existsSync(d)) return;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p); else if (e.name.endsWith('.json')) add(fs.readFileSync(p, 'utf8'));
    }
  })(data);
  return refs;
}

function pruneMedia(dry) {
  const refs = referencedMedia();
  const mediaDir = path.join(CONTENT, 'media');
  let files = 0, bytes = 0;
  for (const sub of fs.readdirSync(mediaDir, { withFileTypes: true })) {
    if (!sub.isDirectory()) continue;
    const d = path.join(mediaDir, sub.name);
    for (const f of fs.readdirSync(d)) {
      if (refs.has(`/media/${sub.name}/${f}`)) continue;
      const p = path.join(d, f);
      bytes += fs.statSync(p).size; files++;
      if (!dry) fs.unlinkSync(p);
    }
    if (!dry && !fs.readdirSync(d).length) fs.rmdirSync(d);
  }
  return { files, bytes };
}

module.exports = { clean, offCanvas, pruneMedia, referencedMedia, reloadBlocklist: () => { BLOCK = loadBlocklist(); return BLOCK; } };

// ---------- запуск из командной строки ----------
if (require.main === module) {
  const argv = new Set(process.argv.slice(2));
  const dry = argv.has('--dry');
  const dir = path.join(CONTENT, 'templates');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort((a, b) => parseInt(a) - parseInt(b));
  let changed = 0, comps = 0, alts = 0;
  const warnAll = [];
  console.log(`Blocklist: ${BLOCK.size} файл(ов)${dry ? '   (--dry: файлы не меняются)' : ''}\n`);
  for (const f of files) {
    const file = path.join(dir, f);
    const src = fs.readFileSync(file, 'utf8');
    const { template, removed, warnings } = clean(JSON.parse(src));
    const out = JSON.stringify(template);
    if (out !== src) { changed++; if (!dry) fs.writeFileSync(file, out); }
    const main = removed.filter(r => r.what !== 'alt');
    alts += removed.filter(r => r.what === 'alt').reduce((s, r) => s + r.count, 0);
    comps += main.filter(r => r.what === 'компонент').length;
    if (main.length) {
      console.log(`#${template.id}`);
      for (const r of main) console.log('  − ' + [r.what, r.type, r.media || r.at, r.text ? `«${r.text}»` : '', r.was ? `«${r.was}» → «${r.now}»` : '', '— ' + r.reason].filter(Boolean).join(' '));
    }
    for (const w of warnings) warnAll.push({ id: template.id, ...w });
  }
  console.log(`\nШаблонов изменено: ${changed} из ${files.length}. Удалено компонентов: ${comps}. Удалено alt: ${alts}.`);
  if (warnAll.length) {
    console.log('\nВидимый текст — проверить вручную (не изменён):');
    for (const w of warnAll) console.log(`  #${w.id} ${w.kind}: «${w.match}» в ${w.at}: «${w.text}»`);
  } else console.log('В видимом тексте телефонов, ников, ссылок на соцсети и чужих брендов не найдено.');

  if (argv.has('--prune-media')) {
    const { files: n, bytes } = pruneMedia(dry);
    console.log(`\nМедиафайлов без ссылок: ${n}, ${(bytes / 1048576).toFixed(1)} МБ${dry ? ' (не удалены: --dry)' : ' — удалены'}.`);
  }
  if (!dry && changed) {
    // если сервисы запущены — каталог перечитает шаблоны без перезапуска
    fetch((process.env.CATALOG_URL || 'http://127.0.0.1:8031') + '/_internal/reload', { method: 'POST' })
      .then(r => console.log(r.ok ? 'Каталог перечитал шаблоны.' : `Каталог ответил ${r.status}.`))
      .catch(() => console.log('Каталог не запущен — перечитает шаблоны при старте.'));
  }
}
