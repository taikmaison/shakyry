/**
 * Repoints demos that are pinned to a retired shaqyru24.kz deployment.
 *
 * Every demo loads the Next.js runtime from the vendor's CDN with the build's
 * content hashes baked into the URLs. When the vendor redeploys, the old chunks
 * 404 and the demo hydrates into a blank white page — nothing in the saved HTML
 * looks wrong, so the breakage is invisible until you open it.
 *
 * The saved pages are all the same app and the same /view route, so the asset
 * tags line up 1:1 between builds and can be copied from a demo that still
 * works. Run tools/audit_builds.mjs --probe first to see which builds are dead.
 *
 * Usage: node tools/repoint_demos.mjs --ref <id> <id> [id...] [--dry]
 */
import fs from 'fs';
import path from 'path';

const DEMOS = path.join(process.cwd(), 'public', 'demos');
const args = process.argv.slice(2);
const dry = args.includes('--dry');
const refIdx = args.indexOf('--ref');
const ref = refIdx === -1 ? null : args[refIdx + 1];
const targets = args.filter((a, i) => /^\d+$/.test(a) && i !== refIdx + 1);

if (!ref || !targets.length) {
  console.error('usage: node tools/repoint_demos.mjs --ref <id> <id> [id...] [--dry]');
  process.exit(1);
}

const TAG_RE = /<(?:link|script)\b[^>]*?(?:href|src)="(https:\/\/shaqyru24\.kz\/_next\/static\/[^"]+)"[^>]*>/gi;
const read = (id) => fs.readFileSync(path.join(DEMOS, String(id), 'index.html'), 'utf8');
const urlsOf = (html) => [...html.matchAll(TAG_RE)].map((m) => m[1]);
const buildIdOf = (html) => html.match(/_next\/static\/([A-Za-z0-9_-]{16,})\/_buildManifest\.js/)?.[1];

const refHtml = read(ref);
const refUrls = urlsOf(refHtml);
const refBuild = buildIdOf(refHtml);
console.log(`reference demo ${ref}: build ${refBuild}, ${refUrls.length} asset tags`);

for (const id of targets) {
  const html = read(id);
  const urls = urlsOf(html);

  if (urls.length !== refUrls.length) {
    console.log(`${id}: SKIPPED — ${urls.length} asset tags vs ${refUrls.length} in the reference`);
    continue;
  }

  const oldBuild = buildIdOf(html);
  let i = 0;
  let changed = 0;
  let out = html.replace(TAG_RE, (tag, url) => {
    const replacement = refUrls[i++];
    if (url === replacement) return tag;
    changed++;
    return tag.replace(url, replacement);
  });

  // The payload carries the build id too; keep it consistent with the assets.
  if (oldBuild && refBuild) {
    out = out.split(`"buildId":"${oldBuild}"`).join(`"buildId":"${refBuild}"`);
  }

  if (!dry) fs.writeFileSync(path.join(DEMOS, String(id), 'index.html'), out, 'utf8');
  console.log(`${id}: ${oldBuild} -> ${refBuild}, ${changed} urls rewritten${dry ? ' (dry run)' : ''}`);
}
