/**
 * Strips the vendor's site-level <head> metadata from the saved demo pages.
 *
 * The demos were captured from shaqyru24.kz complete with that site's canonical
 * URL, hreflang alternates, favicons, web manifest, search-console token and
 * "index, follow" robots directive. Inside a preview iframe none of it is
 * useful, and some of it is harmful: the canonical and alternate links point
 * search engines at a competitor, and the favicon/manifest requests resolve to
 * our SPA fallback — six bogus HTML responses per demo, 1000+ in total.
 *
 * Usage: node tools/clean_demo_head.mjs [--dry]
 */
import fs from 'fs';
import path from 'path';

const DEMOS = path.join(process.cwd(), 'public', 'demos');
const dry = process.argv.includes('--dry');

const DROP = [
  // Icons and manifest: these resolve against our origin, where they do not exist.
  /<link\b[^>]*rel="(?:shortcut )?icon"[^>]*>\s*/gi,
  /<link\b[^>]*rel="apple-touch-icon"[^>]*>\s*/gi,
  /<link\b[^>]*rel="manifest"[^>]*>\s*/gi,
  // SEO signals pointing back at shaqyru24.kz.
  /<link\b[^>]*rel="canonical"[^>]*>\s*/gi,
  /<link\b[^>]*rel="alternate"[^>]*>\s*/gi,
  /<meta\b[^>]*property="og:[^"]*"[^>]*>\s*/gi,
  /<meta\b[^>]*name="twitter:[^"]*"[^>]*>\s*/gi,
  /<meta\b[^>]*name="yandex-verification"[^>]*>\s*/gi,
  /<meta\b[^>]*name="author"[^>]*>\s*/gi,
  /<meta\b[^>]*name="robots"[^>]*>\s*/gi,
];

const NOINDEX = '<meta name="robots" content="noindex, nofollow"/>';

let touched = 0;
let dropped = 0;
let bytes = 0;

for (const entry of fs.readdirSync(DEMOS, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const file = path.join(DEMOS, entry.name, 'index.html');
  if (!fs.existsSync(file)) continue;

  const before = fs.readFileSync(file, 'utf8');
  if (before.startsWith('<!-- demo-placeholder -->')) continue;

  let after = before;
  let count = 0;
  for (const re of DROP) {
    after = after.replace(re, () => { count++; return ''; });
  }
  if (!count) continue;

  // A preview copy of someone else's page should never be indexed.
  if (!after.includes('name="robots"')) {
    after = after.replace(/<\/head>/i, `${NOINDEX}</head>`);
  }

  touched++;
  dropped += count;
  bytes += before.length - after.length;
  if (!dry) fs.writeFileSync(file, after, 'utf8');
}

console.log(
  `${dry ? '[dry run] ' : ''}${touched} demo pages cleaned, ` +
  `${dropped} head tags removed, ${(bytes / 1024).toFixed(1)} KB dropped`
);
