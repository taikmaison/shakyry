/**
 * Downloads the root-path assets the demos still expect from our own origin.
 *
 * assetPrefix fixes the JS chunks, but the builder also injects @font-face and
 * audio with root-relative paths (/fonts/…, /sounds/…). Those keep resolving
 * against whoever serves the page, so we host them ourselves rather than lean
 * on host rewrites.
 *
 * Paths are discovered from the demo payloads and, optionally, from a live
 * crawl — pass --crawl with a plain static server running (tools/serve_static.mjs)
 * to catch anything only requested at runtime.
 *
 * Usage: node tools/vendor_root_assets.mjs [--crawl http://localhost:4174] [--demos 12]
 */
import fs from 'fs';
import path from 'path';

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i === -1 ? d : args[i + 1]; };
const crawlBase = args.includes('--crawl') ? opt('crawl', 'http://localhost:4174') : null;
const demoSample = Number(opt('demos', 12));

const ROOT = path.join(process.cwd(), 'public');
const DEMOS = path.join(ROOT, 'demos');
const HOST_FOR = (p) => (p.startsWith('/uploads/') ? 'https://tyrasoft.kz' : 'https://shaqyru24.kz');

const wanted = new Set();

const walk = (node) => {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) return node.forEach(walk);
  for (const v of Object.values(node)) {
    if (typeof v === 'string' && /^\/(fonts|sounds)\//.test(v)) wanted.add(v.split('?')[0]);
    else if (v && typeof v === 'object') walk(v);
  }
};

const demoIds = fs
  .readdirSync(DEMOS, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .filter((id) => {
    const f = path.join(DEMOS, id, 'index.html');
    return fs.existsSync(f) && !fs.readFileSync(f, 'utf8').startsWith('<!-- demo-placeholder -->');
  });

for (const id of demoIds) {
  const html = fs.readFileSync(path.join(DEMOS, id, 'index.html'), 'utf8');
  const m = html.match(/id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
  if (m) { try { walk(JSON.parse(m[1])); } catch { /* ignore */ } }
  for (const g of html.matchAll(/["'(](\/(?:fonts|sounds)\/[^"')?]+)/g)) wanted.add(g[1]);
}
console.log(`from payloads: ${wanted.size} paths`);

if (crawlBase) {
  const { default: puppeteer } = await import('puppeteer');
  const browser = await puppeteer.launch();
  const step = Math.max(1, Math.floor(demoIds.length / demoSample));
  const sample = demoIds.filter((_, i) => i % step === 0).slice(0, demoSample);
  console.log(`crawling ${sample.length} demos on ${crawlBase} for runtime-only paths…`);

  for (const id of sample) {
    const page = await browser.newPage();
    await page.setViewport({ width: 500, height: 900 });
    page.on('response', (r) => {
      const u = new URL(r.url());
      if (u.origin === new URL(crawlBase).origin && /^\/(fonts|sounds)\//.test(u.pathname)) {
        wanted.add(u.pathname);
      }
    });
    try {
      await page.goto(`${crawlBase}/demos/${id}/index.html`, { waitUntil: 'networkidle2', timeout: 45000 });
      await new Promise((r) => setTimeout(r, 2500));
      await page.evaluate(() => document.querySelector('.envelope-button')?.click());
      await new Promise((r) => setTimeout(r, 2500));
    } catch { /* a slow demo should not stop the sweep */ }
    await page.close();
  }
  await browser.close();
  console.log(`after crawl: ${wanted.size} paths`);
}

let saved = 0;
let failed = 0;
let bytes = 0;

for (const p of [...wanted].sort()) {
  const dest = path.join(ROOT, p.replace(/^\//, ''));
  if (fs.existsSync(dest)) continue;
  const url = HOST_FOR(p) + p;
  try {
    const res = await fetch(url, { redirect: 'follow' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, buf);
    saved++;
    bytes += buf.length;
    console.log(`  saved ${p} (${(buf.length / 1024).toFixed(0)} KB)`);
  } catch (e) {
    failed++;
    console.log(`  FAILED ${p} — ${e.message}`);
  }
}

console.log(`\ndownloaded ${saved} files, ${(bytes / 1024).toFixed(0)} KB; ${failed} failed`);
