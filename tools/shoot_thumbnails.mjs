/**
 * Regenerates catalog thumbnails by screenshotting the local demo pages.
 *
 * A few templates pointed at thumbnails on tyrasoft.kz that now return 404,
 * leaving broken images in the catalog. The demo we already host is the most
 * faithful preview available, so we shoot it ourselves.
 *
 * The dev server must be running (npm run dev).
 *
 * Usage: node tools/shoot_thumbnails.mjs <id> [id...] [--base http://localhost:5173]
 */
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';

const args = process.argv.slice(2);
const baseIdx = args.indexOf('--base');
const base = baseIdx === -1 ? 'http://localhost:5173' : args[baseIdx + 1];
const ids = args.filter((a) => /^\d+$/.test(a));

if (!ids.length) {
  console.error('usage: node tools/shoot_thumbnails.mjs <id> [id...]');
  process.exit(1);
}

const outDir = path.join(process.cwd(), 'public', 'templates');
const browser = await puppeteer.launch();

try {
  for (const id of ids) {
    const page = await browser.newPage();
    await page.setViewport({ width: 560, height: 1000, deviceScaleFactor: 1 });
    await page.goto(`${base}/demos/${id}/index.html`, { waitUntil: 'networkidle2', timeout: 60000 });
    // The demo fades in its own loader; give the animation time to settle.
    await new Promise((r) => setTimeout(r, 4000));

    // Most demos open behind an "envelope" gate — the invitation itself is
    // what we want in the thumbnail, not the "press to open" screen.
    const opened = await page.evaluate(() => {
      const btn = document.querySelector('.envelope-button');
      if (!btn) return false;
      btn.click();
      return true;
    });
    if (opened) await new Promise((r) => setTimeout(r, 4000));
    const dest = path.join(outDir, `template_${id}.jpg`);
    await page.screenshot({ path: dest, type: 'jpeg', quality: 82 });
    console.log(`${id} -> /templates/template_${id}.jpg (${(fs.statSync(dest).size / 1024).toFixed(0)} KB)`);
    await page.close();
  }
} finally {
  await browser.close();
}
