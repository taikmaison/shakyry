/**
 * Scrolls the whole catalog and reports thumbnails that fail to load.
 *
 * Cards use loading="lazy", so a broken thumbnail only shows up once it scrolls
 * into view — a quick look at the top of the page proves nothing.
 *
 * Usage: node tools/check_catalog_images.mjs [--base http://localhost:5173]
 */
import puppeteer from 'puppeteer';

const args = process.argv.slice(2);
const i = args.indexOf('--base');
const base = i === -1 ? 'http://localhost:5173' : args[i + 1];

const browser = await puppeteer.launch();
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto(base, { waitUntil: 'networkidle2', timeout: 60000 });

  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += window.innerHeight) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
  });
  await new Promise((r) => setTimeout(r, 3000));

  const report = await page.evaluate(() => {
    const imgs = [...document.images];
    return {
      cards: document.querySelectorAll('.template-card').length,
      total: imgs.length,
      pending: imgs.filter((im) => !im.complete).length,
      broken: imgs.filter((im) => im.complete && im.naturalWidth === 0).map((im) => im.getAttribute('src')),
    };
  });

  console.log(`cards: ${report.cards} | images: ${report.total} | still loading: ${report.pending}`);
  console.log(report.broken.length ? `BROKEN (${report.broken.length}):\n  ${report.broken.join('\n  ')}` : 'broken: none');
} finally {
  await browser.close();
}
