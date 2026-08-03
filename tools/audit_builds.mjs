/**
 * Reports which shaqyru24.kz build each demo is pinned to.
 *
 * The demos load their CSS and JS from https://shaqyru24.kz/_next/static/...,
 * with the deployment id and build id baked into every URL. When the vendor
 * redeploys, those files disappear and the demo hydrates into a blank page —
 * the saved HTML looks perfectly healthy on disk. This groups the demos by
 * build so a dead build shows up as a cluster rather than one-off weirdness.
 *
 * Usage: node tools/audit_builds.mjs [--probe]
 *   --probe  also HEAD-requests one asset per build to see if it still exists
 */
import fs from 'fs';
import path from 'path';

const DEMOS = path.join(process.cwd(), 'public', 'demos');
const probe = process.argv.includes('--probe');

const builds = new Map();

for (const entry of fs.readdirSync(DEMOS, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const file = path.join(DEMOS, entry.name, 'index.html');
  if (!fs.existsSync(file)) continue;
  const html = fs.readFileSync(file, 'utf8');
  if (html.startsWith('<!-- demo-placeholder -->')) continue;

  const buildId = html.match(/_next\/static\/([A-Za-z0-9_-]{16,})\/_buildManifest\.js/)?.[1];
  const sample = html.match(/https:\/\/shaqyru24\.kz\/_next\/static\/chunks\/pages\/view-[^"?]+(\?[^"]*)?/)?.[0];
  const key = buildId || 'none';
  if (!builds.has(key)) builds.set(key, { ids: [], sample });
  builds.get(key).ids.push(entry.name);
}

const rows = [...builds.entries()].sort((a, b) => b[1].ids.length - a[1].ids.length);

for (const [buildId, info] of rows) {
  let state = '';
  if (probe && info.sample) {
    try {
      const res = await fetch(info.sample, { method: 'HEAD' });
      state = res.ok ? '  [assets LIVE]' : `  [assets DEAD ${res.status}]`;
    } catch (e) {
      state = `  [probe failed: ${e.message}]`;
    }
  }
  console.log(`${buildId}: ${info.ids.length} demos${state}`);
  if (info.ids.length <= 12) console.log(`   ${info.ids.join(', ')}`);
}
