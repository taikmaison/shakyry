/**
 * Static health check for the downloaded demo pages.
 *
 * Each demo is a saved Next.js page; the invitation itself lives in the
 * __NEXT_DATA__ payload under pageProps.pageData.builderPageData.blocks and is
 * drawn on hydration. A page can therefore look fine on disk and still render
 * an empty screen, so we count the blocks rather than trusting the file size.
 *
 * Usage: node tools/audit_demos.mjs
 */
import fs from 'fs';
import path from 'path';

const DEMOS = path.join(process.cwd(), 'public', 'demos');
const MARKER = '<!-- demo-placeholder -->';

const countComponents = (blocks) => {
  let n = 0;
  const walk = (list) => {
    for (const b of list || []) {
      n++;
      if (Array.isArray(b.components)) walk(b.components);
    }
  };
  walk(blocks);
  return n;
};

const rows = [];
for (const entry of fs.readdirSync(DEMOS, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const id = entry.name;
  const file = path.join(DEMOS, id, 'index.html');

  if (!fs.existsSync(file)) { rows.push({ id, status: 'no-index' }); continue; }

  const html = fs.readFileSync(file, 'utf8');
  if (html.startsWith(MARKER)) { rows.push({ id, status: 'placeholder' }); continue; }

  const m = html.match(/id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
  if (!m) { rows.push({ id, status: 'no-payload' }); continue; }

  let data;
  try { data = JSON.parse(m[1]); } catch { rows.push({ id, status: 'bad-json' }); continue; }

  const pageData = data?.props?.pageProps?.pageData;
  const error = data?.props?.pageProps?.error;
  const blocks = pageData?.builderPageData?.blocks;

  if (error) { rows.push({ id, status: 'page-error', note: String(error).slice(0, 60) }); continue; }
  if (!Array.isArray(blocks)) { rows.push({ id, status: 'no-blocks' }); continue; }

  const components = countComponents(blocks);
  rows.push({
    id,
    status: components < 5 ? 'empty' : 'ok',
    blocks: blocks.length,
    components,
    lang: pageData?.lang,
    assets: fs.existsSync(path.join(DEMOS, id, 'assets'))
      ? fs.readdirSync(path.join(DEMOS, id, 'assets')).length
      : 0,
  });
}

const by = (s) => rows.filter((r) => r.status === s);
const summary = {};
for (const r of rows) summary[r.status] = (summary[r.status] || 0) + 1;
console.log('total demo folders:', rows.length);
console.log('summary:', summary);

for (const s of ['no-index', 'no-payload', 'bad-json', 'page-error', 'no-blocks', 'empty', 'placeholder']) {
  const list = by(s);
  if (list.length) console.log(`\n${s} (${list.length}):`, list.map((r) => r.id).join(', '));
}

const langs = {};
for (const r of by('ok')) langs[r.lang] = (langs[r.lang] || 0) + 1;
console.log('\nlanguages among healthy demos:', langs);

const noAssets = by('ok').filter((r) => r.assets === 0);
if (noAssets.length) console.log('healthy demos with no downloaded assets:', noAssets.map((r) => r.id).join(', '));
