/**
 * Opens every demo in a real browser and reports the ones that render nothing.
 *
 * The static check in tools/audit_demos.mjs only proves the payload is intact.
 * A demo can still come up blank — a retired vendor build, a missing chunk, a
 * hydration error — and the only way to know is to run it. This opens each
 * page, clicks through the envelope gate, and measures what actually landed in
 * the DOM.
 *
 * A server must be running (npm run dev, or npm run preview to check the build).
 *
 * Usage: node tools/verify_demos.mjs [--base http://localhost:5173] [--limit N] [--concurrency 3]
 */
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};

const base = opt('base', 'http://localhost:5173');
const limit = Number(opt('limit', 0));
const concurrency = Number(opt('concurrency', 3));

const DEMOS = path.join(process.cwd(), 'public', 'demos');
const ids = fs
  .readdirSync(DEMOS, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .filter((id) => {
    const f = path.join(DEMOS, id, 'index.html');
    return fs.existsSync(f) && !fs.readFileSync(f, 'utf8').startsWith('<!-- demo-placeholder -->');
  })
  .sort((a, b) => Number(a) - Number(b));

const queue = limit ? ids.slice(0, limit) : ids;
console.log(`checking ${queue.length} demos against ${base} (concurrency ${concurrency})`);

const browser = await puppeteer.launch();
const results = [];
let cursor = 0;

const worker = async () => {
  while (cursor < queue.length) {
    const id = queue[cursor++];
    const page = await browser.newPage();
    await page.setViewport({ width: 500, height: 900 });
    const failedUrls = [];
    page.on('requestfailed', (r) => failedUrls.push(r.url()));
    page.on('response', (r) => { if (r.status() >= 400) failedUrls.push(`${r.status()} ${r.url()}`); });

    try {
      await page.goto(`${base}/demos/${id}/index.html`, { waitUntil: 'networkidle2', timeout: 45000 });
      await new Promise((r) => setTimeout(r, 2500));
      await page.evaluate(() => document.querySelector('.envelope-button')?.click());
      await new Promise((r) => setTimeout(r, 3000));

      const stats = await page.evaluate(() => {
        const broken = [...document.images].filter((i) => i.complete && i.naturalWidth === 0);
        return {
          imgs: document.images.length,
          broken: broken.map((i) => i.getAttribute('src')),
          text: document.body.innerText.trim().length,
          // Demo 999 is hand-built rather than a saved Next.js page, so fall
          // back to the body when there is no Next root to measure.
          dom: (document.getElementById('__next') || document.body).innerHTML.length,
        };
      });

      const ok = stats.dom > 2000 && (stats.imgs > 0 || stats.text > 50);
      results.push({ id, ok, ...stats, failed: failedUrls.length });
      process.stdout.write(ok ? '.' : `\n  ${id}: EMPTY (dom ${stats.dom}, imgs ${stats.imgs}, text ${stats.text})\n`);
    } catch (e) {
      results.push({ id, ok: false, error: e.message.slice(0, 60) });
      process.stdout.write(`\n  ${id}: ERROR ${e.message.slice(0, 60)}\n`);
    } finally {
      await page.close();
    }
  }
};

try {
  await Promise.all(Array.from({ length: concurrency }, worker));
} finally {
  await browser.close();
}

const bad = results.filter((r) => !r.ok);
const brokenImgs = results.filter((r) => r.ok && r.broken?.length);
console.log(`\n\nrendered: ${results.length - bad.length}/${results.length}`);
if (bad.length) console.log('EMPTY OR ERRORED:', bad.map((r) => r.id).join(', '));
if (brokenImgs.length) {
  console.log('rendered with broken images:');
  for (const r of brokenImgs) console.log(`  ${r.id}: ${r.broken.length}/${r.imgs} — ${r.broken.join(', ')}`);
}
