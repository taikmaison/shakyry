/**
 * Removes the "Копия:" prefixes the vendor's builder stamps onto duplicated
 * templates. Titles arrived looking like
 *   "Копия: Копия: Копия: Копия: Elegant 2026 Red (KY) (KZ) (KZ) (KZ)"
 * and the prefix says nothing to a customer browsing the catalog.
 *
 * Pass --suffix to also collapse the repeated language tags that come from the
 * same copying ("(KZ) (KZ) (KZ)" -> "(KZ)").
 *
 * Usage: node tools/clean_titles.mjs [--suffix] [--dry]
 */
import fs from 'fs';
import path from 'path';

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const doSuffix = args.includes('--suffix');
const file = path.join(process.cwd(), 'src', 'real_templates.js');

const { mockTemplates } = await import(`file:///${file.replace(/\\/g, '/')}?t=${Date.now()}`);

const clean = (title) => {
  // The separator is usually a colon, but at least one title uses a dash
  // ("Копия: Копия: Копия - Wed Black White 2026").
  let out = title.replace(/^(?:\s*Копия\s*[:\-–—]\s*)+/iu, '');

  if (doSuffix) {
    // Collapse a run of repeated trailing tags, keeping the first of each.
    const tags = [];
    out = out.replace(/(?:\s*\([A-Za-zА-Яа-я]{2}\))+\s*$/u, (run) => {
      for (const m of run.matchAll(/\(([A-Za-zА-Яа-я]{2})\)/gu)) {
        const tag = m[1].toUpperCase();
        if (!tags.includes(tag)) tags.push(tag);
      }
      return '';
    });
    // Some titles glue the tag straight onto a dash ("ГОЛУБОЙ ШАБЛОН-(KZ)"),
    // which would otherwise be left dangling. Trailing periods are left alone —
    // they are part of names like "Light Base Photo.".
    if (tags.length) {
      out = `${out.replace(/[\s\-–—]+$/u, '')} ${tags.map((t) => `(${t})`).join(' ')}`;
    }
  }

  return out.replace(/\s+/g, ' ').trim();
};

let changed = 0;
const out = mockTemplates.map((t) => {
  const title = clean(t.title);
  if (title !== t.title) {
    changed++;
    if (changed <= 12) console.log(`  ${t.id}: ${t.title}\n      -> ${title}`);
  }
  return { ...t, title };
});

if (!dry) {
  fs.writeFileSync(file, `export const mockTemplates = ${JSON.stringify(out, null, 2)};\n`, 'utf8');
}

const remaining = out.filter((t) => /копия/i.test(t.title)).length;
console.log(`\n${dry ? '[dry run] ' : ''}titles changed: ${changed} of ${out.length}`);
console.log(`still containing "Копия": ${remaining}`);

const byTitle = {};
for (const t of out) byTitle[t.title] = (byTitle[t.title] || 0) + 1;
const dupes = Object.entries(byTitle).filter(([, n]) => n > 1).sort((a, b) => b[1] - a[1]);
console.log(`distinct titles: ${Object.keys(byTitle).length} | titles used by more than one template: ${dupes.length}`);
for (const [title, n] of dupes.slice(0, 8)) console.log(`  ${n}x  ${title}`);
