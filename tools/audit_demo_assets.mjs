/**
 * Checks that every image a demo asks for is actually on disk.
 *
 * Image sources live inside the __NEXT_DATA__ payload, not in the markup, so a
 * missing file only shows as a broken image after hydration. This resolves the
 * payload statically instead.
 *
 * Usage: node tools/audit_demo_assets.mjs
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.join(process.cwd(), 'public');
const DEMOS = path.join(ROOT, 'demos');

const collectSrcs = (node, out = []) => {
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node)) {
    for (const item of node) collectSrcs(item, out);
    return out;
  }
  for (const [key, value] of Object.entries(node)) {
    if (typeof value === 'string' && /^\/(demos|templates|uploads|fonts|sounds)\//.test(value)) {
      out.push({ key, value });
    } else if (value && typeof value === 'object') {
      collectSrcs(value, out);
    }
  }
  return out;
};

let checked = 0;
const missing = [];

for (const entry of fs.readdirSync(DEMOS, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const file = path.join(DEMOS, entry.name, 'index.html');
  if (!fs.existsSync(file)) continue;
  const html = fs.readFileSync(file, 'utf8');
  if (html.startsWith('<!-- demo-placeholder -->')) continue;

  const m = html.match(/id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
  if (!m) continue;
  let data;
  try { data = JSON.parse(m[1]); } catch { continue; }

  const seen = new Set();
  for (const { key, value } of collectSrcs(data)) {
    const url = value.split('?')[0];
    if (seen.has(url)) continue;
    seen.add(url);
    checked++;
    // /uploads, /fonts and /sounds are proxied to the vendor, not stored locally.
    if (!/^\/(demos|templates)\//.test(url)) continue;
    if (!fs.existsSync(path.join(ROOT, url.replace(/^\//, '')))) {
      missing.push({ demo: entry.name, key, url });
    }
  }
}

// og_image only fed the social-preview meta tags, which clean_demo_head.mjs
// removes — a missing one never reaches the page.
const rendered = missing.filter((r) => r.key !== 'og_image');
const social = missing.filter((r) => r.key === 'og_image');

console.log(`checked ${checked} asset references across the demos`);
if (!rendered.length) {
  console.log('missing files that would render: none');
} else {
  console.log(`MISSING (${rendered.length}):`);
  for (const r of rendered) console.log(`  demo ${r.demo}  ${r.key} -> ${r.url}`);
}
if (social.length) {
  console.log(`(plus ${social.length} unused og_image references — social preview only, not rendered)`);
}
