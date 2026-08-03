/**
 * Keeps the catalog honest about which demos actually exist.
 *
 * Six demo folders were left empty by the original download. Vite's SPA
 * fallback answers /demos/<id>/index.html with the catalog page itself, so a
 * missing demo used to render the whole app inside the preview iframe instead
 * of failing visibly. Two things fix that:
 *
 *   1. every empty folder gets a real placeholder page, so the fallback never
 *      fires and the user sees a clear message;
 *   2. every template gets a `demoAvailable` flag, so the catalog can hide the
 *      preview button up front.
 *
 * Usage: node tools/sync_demos.mjs
 */
import fs from 'fs';
import path from 'path';

const root = process.cwd();
const DEMOS = path.join(root, 'public', 'demos');
const TEMPLATES = path.join(root, 'src', 'real_templates.js');
const MARKER = '<!-- demo-placeholder -->';

const placeholder = (id) => `${MARKER}
<!doctype html>
<html lang="kk">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="noindex" />
    <title>Демо қолжетімсіз</title>
    <style>
      html, body { height: 100%; margin: 0; }
      body {
        display: flex; align-items: center; justify-content: center;
        font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
        background: #14121a; color: #ece8f1; text-align: center; padding: 24px;
      }
      .box { max-width: 380px; }
      .icon { font-size: 40px; margin-bottom: 16px; }
      h1 { font-size: 20px; font-weight: 600; margin: 0 0 12px; }
      p { font-size: 14px; line-height: 1.6; color: #a9a2b8; margin: 0 0 8px; }
      .id { font-size: 12px; color: #6d6680; margin-top: 20px; }
    </style>
  </head>
  <body>
    <div class="box">
      <div class="icon">🚧</div>
      <h1>Демо дайын емес</h1>
      <p>Бұл шаблонның алдын ала қарау нұсқасы әзірге жүктелмеген.</p>
      <p>Демоверсия этого шаблона пока не загружена.</p>
      <div class="id">ID: ${id}</div>
    </div>
  </body>
</html>
`;

const hasRealDemo = (id) => {
  const file = path.join(DEMOS, String(id), 'index.html');
  if (!fs.existsSync(file)) return false;
  return !fs.readFileSync(file, 'utf8').startsWith(MARKER);
};

// 1. Fill in the gaps.
const created = [];
for (const entry of fs.readdirSync(DEMOS, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const file = path.join(DEMOS, entry.name, 'index.html');
  if (fs.existsSync(file)) continue;
  fs.writeFileSync(file, placeholder(entry.name), 'utf8');
  created.push(entry.name);
}

// 2. Re-stamp the catalog.
const { mockTemplates } = await import(`file:///${TEMPLATES.replace(/\\/g, '/')}?t=${Date.now()}`);
const stamped = mockTemplates.map((t) => ({ ...t, demoAvailable: hasRealDemo(t.id) }));
fs.writeFileSync(
  TEMPLATES,
  `export const mockTemplates = ${JSON.stringify(stamped, null, 2)};\n`,
  'utf8'
);

const missing = stamped.filter((t) => !t.demoAvailable).map((t) => t.id);
console.log(`placeholders created: ${created.length ? created.join(', ') : 'none'}`);
console.log(`templates without a demo: ${missing.length ? missing.join(', ') : 'none'}`);
console.log(`catalog rewritten: ${stamped.length} templates`);
