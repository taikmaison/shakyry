// Превью шаблонов для каталога и соцсетей — снимки нашего же рендера с примером данных.
// Нужен запущенный сайт (`node run.js` в корне проекта) и puppeteer (cd tools && npm install).
//   node tools/previews.js             — шаблоны, у которых ещё нет превью
//   node tools/previews.js --force     — все заново
//   node tools/previews.js 296 310     — только эти (заново)
// Результат: content/previews/<id>.webp (каталог, 390×693) и <id>.jpg (og:image, 780×1380)
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const BASE = process.env.BASE || 'http://127.0.0.1:8024';
const OUT = path.join(__dirname, '..', 'content', 'previews');
const PARALLEL = Number(process.env.PARALLEL) || 3;
fs.mkdirSync(OUT, { recursive: true });

const args = process.argv.slice(2);
const force = args.includes('--force');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const has = id => fs.existsSync(path.join(OUT, `${id}.webp`)) && fs.existsSync(path.join(OUT, `${id}.jpg`));

(async () => {
  let ids = args.filter(a => /^\d+$/.test(a)).map(Number);
  if (!ids.length) {
    ids = (await (await fetch(`${BASE}/api/templates`)).json()).map(t => t.id);
    if (!force) ids = ids.filter(id => !has(id));
  }
  console.log(`Снимков: ${ids.length}`);
  // protocolTimeout короткий: зависший снимок не держит очередь по 3 минуты
  const browser = await puppeteer.launch({ headless: true, protocolTimeout: 45000, args: ['--mute-audio', '--autoplay-policy=no-user-gesture-required',
    // без этого параллельные (фоновые) вкладки не рисуются, и снимок зависает
    '--disable-renderer-backgrounding', '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows'] });
  let i = 0, done = 0;
  const failed = [];

  const shootOnce = async id => {
    const page = await browser.newPage();
    try {
      await page.setViewport({ width: 390, height: 690, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
      // видео грузятся потоком, и сеть может не затихнуть никогда — ждём недолго и снимаем как есть
      await page.goto(`${BASE}/t/${id}?shot=1`, { waitUntil: 'networkidle2', timeout: 25000 }).catch(e => { if (!/timeout/i.test(e.message)) throw e; });
      // шрифты и первый кадр видео
      await page.evaluate(async () => {
        await Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 5000))]);
        await Promise.all([...document.querySelectorAll('video')].map(v => v.readyState >= 2 ? 0 : new Promise(r => { v.addEventListener('loadeddata', r, { once: true }); setTimeout(r, 4000); })));
      });
      await sleep(400);
      await page.screenshot({ path: path.join(OUT, `${id}.jpg`), type: 'jpeg', quality: 78, captureBeyondViewport: false });
      await page.setViewport({ width: 390, height: 693, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
      await sleep(200);
      await page.screenshot({ path: path.join(OUT, `${id}.webp`), type: 'webp', quality: 80, captureBeyondViewport: false });
    } finally {
      await page.close().catch(() => {});
    }
  };
  const shoot = async id => {
    try { await shootOnce(id); }
    catch (e) {
      try { await shootOnce(id); }   // вторая попытка — тяжёлые шаблоны иногда не успевают с первой
      catch (e2) { failed.push(id); console.log(`  #${id}: ${e2.message.split('\n')[0]}`); }
    }
    if (++done % 20 === 0 || done === ids.length) console.log(`  ${done}/${ids.length}`);
  };

  await Promise.all(Array.from({ length: PARALLEL }, async () => { while (i < ids.length) await shoot(ids[i++]); }));
  await browser.close();
  console.log(`Готово: ${OUT}${failed.length ? `\nНе получились: ${failed.join(' ')} — повторите: node tools/previews.js ${failed.join(' ')}` : ''}`);
})();
