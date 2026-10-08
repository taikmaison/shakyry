// Локальный запуск всех сервисов: node run.js
// Каждый сервис — отдельный процесс в своей папке со своими переменными окружения из services.json.
// Упавший сервис перезапускается; Ctrl+C останавливает все.
//   node run.js                 — все сервисы
//   node run.js catalog web     — только указанные
//   node run.js --offset=100    — все порты +100 (второй экземпляр рядом с первым)
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// секреты из .env (не попадает в git): строки ИМЯ=значение, # — комментарий
const envFile = path.join(__dirname, '.env');
const fromEnvFile = new Set();
if (fs.existsSync(envFile))
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_]\w*)\s*=\s*(.*?)\s*$/);
    if (m && !line.trim().startsWith('#') && process.env[m[1]] == null) {
      process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
      fromEnvFile.add(m[1]);
    }
  }

const conf = JSON.parse(fs.readFileSync(path.join(__dirname, 'services.json'), 'utf8'));
const args = process.argv.slice(2);
const offset = Number((args.find(a => a.startsWith('--offset=')) || '=0').split('=')[1]) || 0;
for (const s of Object.values(conf.services)) s.port += offset;
// второй экземпляр рядом с основным не должен забирать сообщения у того же Telegram-бота
if (offset && fromEnvFile.has('AUTH__TELEGRAM_BOT_TOKEN')) {
  delete process.env.AUTH__TELEGRAM_BOT_TOKEN;
  console.log('--offset: Telegram-бот из .env не подключается — он работает у основного экземпляра');
}
if (offset) conf.site.PUBLIC_URL = conf.site.PUBLIC_URL.replace(/:(\d+)$/, (m, p) => ':' + (Number(p) + offset));
const HOST = process.env.HOST || '127.0.0.1';
const local = HOST === '0.0.0.0' ? '127.0.0.1' : HOST;
const site = { ...conf.site, ...(process.env.PUBLIC_URL && !offset ? { PUBLIC_URL: process.env.PUBLIC_URL } : {}) };
const urlOf = name => `http://${local}:${conf.services[name].port}`;

// значение в services.json: имя сервиса → его адрес; "сервис:/путь" → адрес + путь; "@site" → общая настройка сайта
function resolve(key, v) {
  if (Array.isArray(v)) return v.map(x => resolve(key, x)).join(',');
  if (v === '@site') return site[key];
  const m = String(v).match(/^(\w+)(:\/.*)?$/);
  if (m && conf.services[m[1]]) return urlOf(m[1]) + (m[2] ? m[2].slice(1) : '');
  return String(v);
}
function envFor(name) {
  const s = conf.services[name];
  const out = { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, TEMP: process.env.TEMP, TMP: process.env.TMP, HOST, PORT: String(s.port) };
  for (const [k, v] of Object.entries(s.env)) out[k] = resolve(k, v);
  // переменные вида AUTH__TELEGRAM_BOT_TOKEN=... (из окружения или .env) передаются только своему сервису
  const prefix = name.toUpperCase() + '__';
  for (const [k, v] of Object.entries(process.env)) if (k.startsWith(prefix)) out[k.slice(prefix.length)] = v;
  return out;
}

const ALL = Object.keys(conf.services);
const names = args.filter(a => !a.startsWith('--'));
const chosen = names.length ? names : ALL;
const children = new Map();
let stopping = false;

function run(name, attempt = 0) {
  const dir = path.join(__dirname, 'services', name);
  const child = spawn(process.execPath, ['--disable-warning=ExperimentalWarning', 'src/index.js'], { cwd: dir, env: envFor(name), stdio: ['ignore', 'pipe', 'pipe'] });
  children.set(name, child);
  const log = line => line && console.log(line.startsWith(`[${name}]`) ? line : `[${name}] ${line}`);
  child.stdout.on('data', d => String(d).split(/\r?\n/).forEach(log));
  child.stderr.on('data', d => String(d).split(/\r?\n/).forEach(log));
  const started = Date.now();
  child.on('exit', code => {
    if (stopping) return;
    const next = Date.now() - started < 5000 ? attempt + 1 : 0;   // падает сразу после старта — увеличиваем паузу
    const delay = Math.min(30000, 500 * 2 ** next);
    console.log(`[${name}] остановился (код ${code}), перезапуск через ${delay / 1000} с`);
    setTimeout(() => run(name, next), delay);
  });
}

(async () => {
  for (const name of chosen) run(name);
  const deadline = Date.now() + 20000;
  let ok = [];
  while (Date.now() < deadline) {
    ok = await Promise.all(chosen.map(n => fetch(urlOf(n) + '/health').then(r => r.ok).catch(() => false)));
    if (ok.every(Boolean)) break;
    await new Promise(r => setTimeout(r, 300));
  }
  const bad = chosen.filter((n, i) => !ok[i]);
  if (bad.length) console.log(`Не запустились: ${bad.join(', ')}`);
  else if (chosen.includes('gateway')) console.log(`\nВсе сервисы работают. Откройте: ${urlOf('gateway')}/\n`);
})();

function stop() {
  stopping = true;
  for (const c of children.values()) c.kill();
  setTimeout(() => process.exit(0), 300);
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
