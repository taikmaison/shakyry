// Скачать архив шаблонов и медиа из Google Drive и распаковать в content/.
//   node tools/fetch-content.js                  — ссылка из CONTENT_URL (окружение или .env в корне проекта)
//   node tools/fetch-content.js <ссылка>         — ссылка напрямую
//   node tools/fetch-content.js --extra [ссылка] — доп. архивы поверх content/ (своя музыка: content/music.json, music-2.json… + content/media/…),
//                                                  ссылки из CONTENT_EXTRA_URL (несколько — через пробел); нет ссылки — ничего не делает
// Ссылка — «Поделиться → Копировать ссылку» на zip-файл (доступ: все, у кого есть ссылка).
// Ссылку не храните в git: репозиторий может быть публичным.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { Readable } = require('stream');
const { pipeline } = require('stream/promises');

const CATALOG = path.join(__dirname, '..');
const EXTRA = process.argv.includes('--extra');
const ZIP = path.join(CATALOG, EXTRA ? 'content-extra.zip' : 'content.zip');

function fromEnvFile(name) {
  const f = path.join(CATALOG, '..', '..', '.env');
  if (!fs.existsSync(f)) return null;
  const m = fs.readFileSync(f, 'utf8').match(new RegExp(`^\\s*${name}\\s*=\\s*(.*?)\\s*$`, 'm'));
  return m ? m[1].replace(/^(['"])(.*)\1$/, '$2') : null;
}
const VAR = EXTRA ? 'CONTENT_EXTRA_URL' : 'CONTENT_URL';
const linkArg = process.argv.slice(2).find(a => !a.startsWith('--')) || process.env[VAR] || fromEnvFile(VAR);
if (!linkArg && EXTRA) { console.log('Доп. архива нет (CONTENT_EXTRA_URL не задан) — пропускаю'); process.exit(0); }
if (!linkArg) { console.error('Нет ссылки: node tools/fetch-content.js <ссылка> или CONTENT_URL=... в .env'); process.exit(2); }
// несколько архивов своей музыки — ссылки через пробел, распаковываются по очереди (у каждого свой music-N.json)
const links = EXTRA ? linkArg.split(/\s+/).filter(Boolean) : [linkArg];
// /file/d/<id>/view, ?id=<id> — берём id и качаем напрямую (большие файлы — без страницы «не удалось проверить на вирусы»)
const ids = links.map(link => {
  const id = (link.match(/\/d\/([\w-]{20,})/) || link.match(/[?&]id=([\w-]{20,})/) || [])[1];
  if (!id) { console.error('Не похоже на ссылку Google Drive на файл: ' + link); process.exit(2); }
  return id;
});

(async () => { for (const id of ids) await fetchOne(id); })().catch(e => { fs.rmSync(ZIP, { force: true }); console.error(e.message || e); process.exit(1); });

async function fetchOne(id) {
  const res = await fetch(`https://drive.usercontent.google.com/download?id=${id}&export=download&confirm=t`);
  const type = res.headers.get('content-type') || '';
  if (!res.ok || type.includes('text/html')) throw new Error(`Google Drive не отдал файл (${res.status}). Проверьте доступ «Все, у кого есть ссылка».`);
  const total = Number(res.headers.get('content-length')) || 0;
  let got = 0, shown = 0;
  const body = Readable.fromWeb(res.body);
  body.on('data', c => {
    got += c.length;
    if (got - shown > 20e6 || got === total) { shown = got; process.stdout.write(`\r  ${(got / 1e6).toFixed(0)}${total ? ' / ' + (total / 1e6).toFixed(0) : ''} МБ`); }
  });
  await pipeline(body, fs.createWriteStream(ZIP));
  console.log();
  const head = Buffer.alloc(2);
  const fd = fs.openSync(ZIP, 'r'); fs.readSync(fd, head, 0, 2, 0); fs.closeSync(fd);
  if (head.toString() !== 'PK') throw new Error('Скачался не zip-архив');

  // распаковка: unzip (Linux) или tar, который понимает zip (Windows 10+, macOS)
  const tar = process.platform === 'win32' ? path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe') : 'tar';
  let r = spawnSync('unzip', ['-oq', ZIP, '-d', CATALOG], { stdio: 'inherit' });
  if (r.error || r.status !== 0) r = spawnSync(tar, ['-xf', ZIP, '-C', CATALOG], { stdio: 'inherit' });
  if (r.error || r.status !== 0) throw new Error('Не удалось распаковать: установите unzip (apt install unzip)');
  fs.rmSync(ZIP, { force: true });

  if (EXTRA) console.log(`Готово: доп. архив распакован в ${path.join(CATALOG, 'content')}`);
  else console.log(`Готово: шаблонов ${JSON.parse(fs.readFileSync(path.join(CATALOG, 'content', 'templates.json'), 'utf8')).length} в ${path.join(CATALOG, 'content')}`);
  // если каталог запущен — перечитает шаблоны сам
  await fetch((process.env.CATALOG_URL || 'http://127.0.0.1:8031') + '/_internal/reload', { method: 'POST' })
    .then(() => console.log('Каталог перечитал шаблоны.')).catch(() => {});
}
