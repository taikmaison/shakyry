// Сборка своих шаблонов (рисуем сами, права наши — всё в git):
//   описания        own/specs/*.js     (каждый файл — массив шаблонов, формат — own/README.md)
//   орнаменты       own/lib/ornaments.js, раскладки — own/lib/layouts.js
//   результат       own/media/<slug>-*.svg, own/templates/<id>.json, own/catalog.json, own/fonts.css
//   node own/build.js              — все (из папки services/catalog)
//   node own/build.js tusaukeser   — только файлы описаний own/specs/tusaukeser*.js (каталог — всегда полный)
// Превью: PREVIEWS_DIR=own/previews node tools/previews.js <id…> при запущенном сайте.
const fs = require('fs');
const path = require('path');
const { build } = require('./lib/layouts');
const { buildDate } = require('./lib/date-layout');

const OWN = __dirname;
const write = (rel, s) => { fs.mkdirSync(path.dirname(path.join(OWN, rel)), { recursive: true }); fs.writeFileSync(path.join(OWN, rel), s); };

write('fonts.css', `/* Свои шаблоны: шрифты под SIL Open Font License (own/fonts/OFL.txt), с казахскими буквами */
@font-face{font-family:"OwnCormorant";src:url("/fonts/own/OwnCormorant.woff") format("woff");font-weight:300 700;font-style:normal;font-display:swap;}
@font-face{font-family:"OwnCormorant";src:url("/fonts/own/OwnCormorantItalic.woff") format("woff");font-weight:300 700;font-style:italic;font-display:swap;}
@font-face{font-family:"OwnMontserrat";src:url("/fonts/own/OwnMontserrat.woff") format("woff");font-weight:100 900;font-style:normal;font-display:swap;}
`);

const only = process.argv.slice(2);
const files = fs.readdirSync(path.join(OWN, 'specs')).filter(f => f.endsWith('.js')).sort();
const cards = [], ids = new Map(), slugs = new Map();
let failed = 0;
for (const f of files) {
  let specs;
  try { delete require.cache[require.resolve(`./specs/${f}`)]; specs = require(`./specs/${f}`); }
  catch (e) { console.error(`✗ ${f}: ${e.message}`); failed++; continue; }
  const rebuild = !only.length || only.some(o => f.startsWith(o));
  for (const s of specs) {
    if (ids.has(s.id)) { console.error(`✗ ${f}: #${s.id} уже есть в ${ids.get(s.id)}`); failed++; continue; }
    if (slugs.has(s.slug)) { console.error(`✗ ${f}: slug «${s.slug}» уже есть в ${slugs.get(s.slug)}`); failed++; continue; }
    ids.set(s.id, f); slugs.set(s.slug, f);
    cards.push({ id: s.id, category: s.category, lang: s.layout === 'date' ? 'ru' : 'kz', popularity: 0, own: true });   // 0 — на посадочных страницах после шаблонов архива
    if (!rebuild) continue;
    try {
      const { tpl, media } = s.layout === 'date' ? buildDate(s) : build(s);
      // старые файлы этого шаблона, которые раскладка больше не создаёт (только точные имена частей:
      // slug «as» не должен задевать файлы шаблона «as-meshit»)
      const own = new RegExp(`^${s.slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-(band|band-dark|divider|corner|rosette|motif|arch|medallion|side|heart)\\.svg$`);
      for (const f of fs.readdirSync(path.join(OWN, 'media'))) if (own.test(f) && !(f in media)) fs.unlinkSync(path.join(OWN, 'media', f));
      for (const [name, text] of Object.entries(media)) write(`media/${name}`, text);
      write(`templates/${s.id}.json`, JSON.stringify(tpl, null, 1) + '\n');
      console.log(`#${s.id} ${s.category} (${s.layout || 'classic'}): ${tpl.blocks[0].components.length} элементов, высота ${tpl.blocks[0].style.height}`);
    } catch (e) { console.error(`✗ #${s.id} (${f}): ${e.message}`); failed++; }
  }
}
cards.sort((a, b) => a.id - b.id);
write('catalog.json', JSON.stringify(cards, null, 1) + '\n');
console.log(`шаблонов в каталоге: ${cards.length}${failed ? `, ошибок: ${failed}` : ''}`);
process.exit(failed ? 1 : 0);
