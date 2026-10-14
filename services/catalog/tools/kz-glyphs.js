// Проверка шрифтов каталога на казахские буквы: в каких шрифтах «қ» нарисована как «к», «ң» как «н» и т.п.,
// а каких букв в шрифте нет совсем (браузер подставит другой шрифт).
//   node tools/kz-glyphs.js [адрес сайта, по умолчанию http://127.0.0.1:8080]   → JSON в stdout
// Нужен запущенный сайт (fonts.css и /fonts/* отдаёт каталог) и puppeteer из tools/node_modules.
const puppeteer = require('puppeteer');

const BASE = process.argv[2] || 'http://127.0.0.1:8080';
// казахская буква → обычная, на которую её подменяют шрифты без казахского (і, І, һ и должны совпадать с i, I, h — их проверяем только на наличие)
const PAIRS = { 'ә': 'е', 'ғ': 'г', 'қ': 'к', 'ң': 'н', 'ө': 'о', 'ұ': 'у', 'ү': 'у', 'Ә': 'Е', 'Ғ': 'Г', 'Қ': 'К', 'Ң': 'Н', 'Ө': 'О', 'Ұ': 'У', 'Ү': 'У' };
const ONLY = 'іІһҺ';
const TAIL = 'қңҚҢ';   // у этих хвост ниже строки — у «к/н» его нет

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(BASE + '/fonts.css');
  const css = await page.evaluate(() => document.body.innerText);
  const faces = [...css.matchAll(/@font-face\{([^}]*)\}/g)].map(m => ({
    family: (m[1].match(/font-family:"([^"]+)"/) || [])[1], weight: (m[1].match(/font-weight:(\w+)/) || [])[1] || 'normal',
    style: (m[1].match(/font-style:(\w+)/) || [])[1] || 'normal', url: (m[1].match(/url\("([^"]+)"\)/) || [])[1],
  })).filter(f => f.family && f.url);
  // страница того же адреса, что и шрифты (иначе браузер не даст их загрузить)
  await page.goto(BASE + '/fonts/', { waitUntil: 'load' }).catch(() => {});
  await page.evaluate(base => new Promise(done => {
    document.head.innerHTML = `<link rel="stylesheet" href="${base}/fonts.css">`; document.body.innerHTML = '<canvas id="c" width="120" height="120"></canvas>';
    document.head.firstChild.onload = done;
  }), BASE);
  const result = await page.evaluate(async (faces, PAIRS, ONLY, TAIL) => {
    const c = document.getElementById('c'), x = c.getContext('2d', { willReadFrequently: true });
    // буква → маска закрашенных точек и нижняя граница рисунка
    const ink = (ch, font) => { x.clearRect(0, 0, 120, 120); x.font = font; x.fillText(ch, 10, 80); const d = x.getImageData(0, 0, 120, 120).data;
      const m = new Uint8Array(14400); let bottom = 0; for (let i = 0; i < 14400; i++) if (d[i * 4 + 3] > 96) { m[i] = 1; bottom = Math.floor(i / 120); } return { m, bottom }; };
    const same = (a, b) => { let diff = 0, any = 0; for (let i = 0; i < 14400; i++) { if (a.m[i] || b.m[i]) any++; if (a.m[i] !== b.m[i]) diff++; } return any > 0 && diff / any < 0.06; };
    const out = [];
    for (const f of faces) {
      const spec = `${f.style} ${f.weight} 64px "${f.family}"`;
      try { await document.fonts.load(spec, 'әқңғ'); } catch { out.push({ ...f, error: 'не загрузился' }); continue; }
      const broken = [], missing = [];
      for (const kz of [...Object.keys(PAIRS), ...ONLY]) {
        const a = ink(kz, `${spec}, serif`), b = ink(kz, `${spec}, monospace`);
        if (!same(a, b) || a.m.join('') !== b.m.join('')) { missing.push(kz); continue; }   // буквы нет — рисует запасной шрифт
        const base = PAIRS[kz];
        if (!base) continue;
        const c = ink(base, `${spec}, serif`);
        if (same(a, c) || (TAIL.includes(kz) && a.bottom <= c.bottom + 2)) broken.push(kz);
      }
      if (broken.length || missing.length) out.push({ family: f.family, weight: f.weight, style: f.style, url: f.url, broken: broken.join(''), missing: missing.join('') });
    }
    return out;
  }, faces, PAIRS, ONLY, TAIL);
  console.log(JSON.stringify({ faces: faces.length, problems: result }, null, 1));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
