/**
 * Screenshots a page from a running server. Handy for eyeballing the catalog
 * or a demo without opening a browser by hand.
 *
 * Usage: node tools/shoot_page.mjs <url> <out.png> [width] [height]
 */
import puppeteer from 'puppeteer';

const [url, out, width = '1280', height = '900'] = process.argv.slice(2);
if (!url || !out) {
  console.error('usage: node tools/shoot_page.mjs <url> <out.png> [width] [height]');
  process.exit(1);
}

const browser = await puppeteer.launch();
try {
  const page = await browser.newPage();
  await page.setViewport({ width: Number(width), height: Number(height) });
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 2500));
  await page.screenshot({ path: out });
  console.log('saved', out);
} finally {
  await browser.close();
}
