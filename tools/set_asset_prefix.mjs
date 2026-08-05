/**
 * Makes the demos load their lazy chunks from the vendor instead of from us.
 *
 * The <script> tags in a saved demo carry absolute shaqyru24.kz URLs, but once
 * Next.js hydrates it asks webpack for further chunks, and webpack builds those
 * URLs from `assetPrefix` in the __NEXT_DATA__ payload. That field was empty,
 * so the requests went to our own origin as /_next/static/chunks/… — served by
 * the dev proxy locally, and a 404 on any real static host. The page then
 * hydrated into a blank screen with nothing in the console.
 *
 * Setting assetPrefix points those requests back at the vendor, so the demos
 * work on a plain static host with no rewrite rules at all.
 *
 * Usage: node tools/set_asset_prefix.mjs [--prefix https://shaqyru24.kz] [--dry]
 */
import fs from 'fs';
import path from 'path';

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const pi = args.indexOf('--prefix');
const PREFIX = pi === -1 ? 'https://shaqyru24.kz' : args[pi + 1];

const DEMOS = path.join(process.cwd(), 'public', 'demos');

let touched = 0;
let already = 0;
let skipped = 0;

for (const entry of fs.readdirSync(DEMOS, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const file = path.join(DEMOS, entry.name, 'index.html');
  if (!fs.existsSync(file)) continue;

  const html = fs.readFileSync(file, 'utf8');
  if (html.startsWith('<!-- demo-placeholder -->')) continue;

  const m = html.match(/(<script[^>]*id="__NEXT_DATA__"[^>]*>)([\s\S]*?)(<\/script>)/i);
  if (!m) { skipped++; continue; }

  let data;
  try { data = JSON.parse(m[2]); } catch { skipped++; continue; }

  if (data.assetPrefix === PREFIX) { already++; continue; }

  data.assetPrefix = PREFIX;
  const next = html.replace(m[0], `${m[1]}${JSON.stringify(data)}${m[3]}`);
  if (!dry) fs.writeFileSync(file, next, 'utf8');
  touched++;
}

console.log(
  `${dry ? '[dry run] ' : ''}assetPrefix set to ${PREFIX} in ${touched} demos ` +
  `(${already} already set, ${skipped} without a payload)`
);
