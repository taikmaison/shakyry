/**
 * Removes third-party analytics/advertising code from the scraped demo pages.
 *
 * The demos were saved from shaqyru24.kz with their marketing stack still inside:
 * Google Tag Manager, Google Ads/Analytics gtag, TikTok Pixel (and, via GTM,
 * the Meta Pixel). Serving them as-is makes every visitor hit those accounts.
 *
 * Usage: node tools/strip_trackers.mjs [--dry]
 */
import fs from 'fs';
import path from 'path';

const DEMOS = path.join(process.cwd(), 'public', 'demos');
const dry = process.argv.includes('--dry');

// A script/noscript block is dropped if its source matches any of these.
const TRACKER_PATTERNS = [
  /googletagmanager\.com/i,
  /analytics\.tiktok\.com/i,
  /connect\.facebook\.net/i,
  /TiktokAnalyticsObject/i,
  /\bgtm\.start\b/i,
  /\bfbq\(/i,
  /gtag\('config'/i,
];

const BLOCK_RE = /[ \t]*<script\b[^>]*>[\s\S]*?<\/script>[ \t]*\n?|[ \t]*<noscript\b[^>]*>[\s\S]*?<\/noscript>[ \t]*\n?/gi;

const isTracker = (block) => {
  // Never touch the Next.js payload — it only *looks* big and scripty.
  if (/id="__NEXT_DATA__"/i.test(block)) return false;
  return TRACKER_PATTERNS.some((re) => re.test(block));
};

let touched = 0;
let removed = 0;
let bytes = 0;

for (const entry of fs.readdirSync(DEMOS, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const file = path.join(DEMOS, entry.name, 'index.html');
  if (!fs.existsSync(file)) continue;

  const before = fs.readFileSync(file, 'utf8');
  let count = 0;
  const after = before.replace(BLOCK_RE, (block) => {
    if (!isTracker(block)) return block;
    count++;
    return '';
  });

  if (!count) continue;
  touched++;
  removed += count;
  bytes += before.length - after.length;
  if (!dry) fs.writeFileSync(file, after, 'utf8');
}

console.log(
  `${dry ? '[dry run] ' : ''}${touched} demo pages cleaned, ` +
  `${removed} tracker blocks removed, ${(bytes / 1024).toFixed(1)} KB dropped`
);
