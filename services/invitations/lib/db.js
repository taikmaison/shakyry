// База данных сервиса. Один интерфейс, два хранилища:
//  — DATABASE_URL задан (postgres://… от Neon) — Postgres по HTTPS: для хостинга без постоянного диска (Vercel);
//  — иначе — файл SQLite (встроенный node:sqlite): локально и на своём сервере (VPS).
// Все методы асинхронные. SQL пишется с плейсхолдерами ?, для Postgres они превращаются в $1, $2…
//   const db = openDb({ name, file, url, migrations }) — name: имя сервиса (своя таблица версий миграций в общей базе)
//   await db.all(sql, ...args) → строки;  await db.get(...) → первая строка или undefined
//   await db.run(sql, ...args) → { changes, rows };  await db.batch([[sql, ...args], …]) — атомарно, одной транзакцией
// Миграции — массив; элемент — строка SQL (одинаковая для обеих баз) или { sqlite, pg }.
// В одной миграции может быть несколько команд через «;».
// Адрес Postgres: <ИМЯ>_DATABASE_URL (своя база у сервиса) или общий DATABASE_URL — тогда у сервисов общая база,
// но у каждого свои таблицы и своя таблица версий _migrations_<имя>.
const fs = require('fs');
const path = require('path');

// ---------- SQLite ----------
function sqlite(file) {
  const { DatabaseSync } = require('node:sqlite');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 3000;');
  const stmts = new Map();
  const prep = sql => { if (!stmts.has(sql)) stmts.set(sql, db.prepare(sql)); return stmts.get(sql); };
  const exec1 = (sql, args) => {
    const st = prep(sql);
    if (/^\s*(select|with)\b|\breturning\b/i.test(sql)) { const rows = st.all(...args); return { rows, changes: rows.length }; }
    const r = st.run(...args);
    return { rows: [], changes: Number(r.changes) };
  };
  return {
    kind: 'sqlite',
    async migrate(migrations) {
      const version = db.prepare('PRAGMA user_version').get().user_version;
      migrations.forEach((m, i) => {
        if (i < version) return;
        db.exec('BEGIN');
        try { db.exec(typeof m === 'string' ? m : m.sqlite); db.exec(`PRAGMA user_version = ${i + 1}`); db.exec('COMMIT'); }
        catch (e) { db.exec('ROLLBACK'); throw e; }
      });
    },
    async query(sql, args) { return exec1(sql, args); },
    async batch(list) {
      db.exec('BEGIN');
      try { const out = list.map(([sql, ...args]) => exec1(sql, args)); db.exec('COMMIT'); return out; }
      catch (e) { db.exec('ROLLBACK'); throw e; }
    },
    async close() { db.close(); },
  };
}

// ---------- Postgres по HTTPS (протокол Neon serverless driver, без зависимостей) ----------
// ? → $1, $2… (вне строк в одинарных кавычках)
function numbered(sql) {
  let n = 0, out = '', quoted = false;
  for (const ch of sql) {
    if (ch === "'") quoted = !quoted;
    out += ch === '?' && !quoted ? '$' + ++n : ch;
  }
  return out;
}
const NUM = new Set([20, 21, 23, 26, 700, 701, 1700]);   // int8, int2, int4, oid, float4, float8, numeric
function parseValue(v, type) {
  if (v === null || v === undefined) return null;
  if (NUM.has(type)) return Number(v);
  if (type === 16) return v === 't' || v === true;
  if (type === 114 || type === 3802) return typeof v === 'string' ? JSON.parse(v) : v;
  return v;
}
const param = v => v === null || v === undefined ? null
  : typeof v === 'boolean' ? (v ? 't' : 'f')
  : typeof v === 'object' ? JSON.stringify(v)
  : String(v);

const sleep = ms => new Promise(r => setTimeout(r, ms));

function postgres(url, name) {
  const versions = '_migrations_' + String(name || 'app').replace(/\W/g, '_');
  const u = new URL(url.replace(/^postgres(ql)?:/, 'https:'));
  // как в официальном драйвере: ep-xxx.region.aws.neon.tech → https://api.region.aws.neon.tech/sql
  const endpoint = process.env.DATABASE_HTTP_ENDPOINT || `https://${u.hostname.replace(/^[^.]+\./, 'api.')}/sql`;
  const headers = { 'Content-Type': 'application/json', 'Neon-Connection-String': url, 'Neon-Raw-Text-Output': 'true', 'Neon-Array-Mode': 'true' };
  const toRows = r => (r.rows || []).map(row => {
    const o = {};
    r.fields.forEach((f, i) => { o[f.name] = parseValue(Array.isArray(row) ? row[i] : row[f.name], f.dataTypeID); });
    return o;
  });
  const result = r => ({ rows: toRows(r), changes: Number(r.rowCount) || 0 });
  // повторяем только то, что точно безопасно: запрос не ушёл (нет соединения) или это чтение.
  // Запись после таймаута или 5xx не повторяем — она могла выполниться.
  const NOT_SENT = new Set(['ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN', 'ENETUNREACH', 'EHOSTUNREACH']);
  const readOnly = body => !body.queries && /^\s*(select|with)/i.test(body.query) && !/returning/i.test(body.query);
  async function send(body, extra = {}) {
    for (let attempt = 0; ; attempt++) {
      let res;
      try {
        res = await fetch(endpoint, { method: 'POST', headers: { ...headers, ...extra }, body: JSON.stringify(body), signal: AbortSignal.timeout(15000) });
      } catch (e) {
        const code = e.cause && e.cause.code;
        if (attempt < 2 && (NOT_SENT.has(code) || (readOnly(body) && e.name !== 'AbortError'))) { await sleep(300 * (attempt + 1)); continue; }
        throw Object.assign(new Error('База данных недоступна: ' + (code || e.message)), { status: 503 });
      }
      const text = await res.text();
      let data = {};
      try { data = JSON.parse(text); } catch { /* не JSON — ошибка прокси */ }
      if (res.ok) return data;
      if (res.status >= 500 && attempt < 2 && readOnly(body)) { await sleep(300 * (attempt + 1)); continue; }
      throw Object.assign(new Error(data.message || `Postgres HTTP ${res.status}: ${text.slice(0, 200)}`),
        { code: data.code, detail: data.detail, ...(res.status >= 500 ? { status: 503 } : {}) });
    }
  }
  const one = (sql, args) => ({ query: numbered(sql), params: args.map(param) });
  const self = {
    kind: 'pg',
    async query(sql, args) { return result(await send(one(sql, args))); },
    async batch(list) {
      if (!list.length) return [];
      const data = await send({ queries: list.map(([sql, ...args]) => one(sql, args)) }, { 'Neon-Batch-Isolation-Level': 'ReadCommitted', 'Neon-Batch-Read-Only': 'false' });
      return (data.results || []).map(result);
    },
    async migrate(migrations) {
      let failedAt = -1, fails = 0;
      for (;;) {
        let version = -1;
        try {
          await self.query(`CREATE TABLE IF NOT EXISTS ${versions} (version INTEGER NOT NULL)`, []);
          const row = (await self.query(`SELECT MAX(version) AS v FROM ${versions}`, [])).rows[0];
          version = row && row.v != null ? row.v : 0;
          if (version >= migrations.length) return;
          const m = migrations[version];
          const statements = (typeof m === 'string' ? m : m.pg).split(';').map(s => s.trim()).filter(Boolean);
          // блокировка — чтобы два экземпляра, стартовав одновременно, не применили миграцию дважды
          await self.batch([['SELECT pg_advisory_xact_lock(7321)'], ...statements.map(s => [s]), [`INSERT INTO ${versions} (version) VALUES (?)`, version + 1]]);
        } catch (e) {
          // параллельный экземпляр мог успеть первым — тогда версия выросла, и это не ошибка;
          // сдаёмся только после трёх неудач подряд на одной и той же версии
          if (version !== failedAt) { failedAt = version; fails = 0; }
          if (++fails >= 3) throw e;
          await sleep(200 * fails);
        }
      }
    },
    async close() {},
  };
  return self;
}

// на Vercel диск не сохраняется: без DATABASE_URL лучше честно отвечать 503, чем молча терять данные
function missing() {
  const fail = async () => { throw Object.assign(new Error('DATABASE_URL не задан — на Vercel нужна база Postgres (Neon)'), { status: 503 }); };
  return { kind: 'none', migrate: fail, query: fail, batch: fail, close: async () => {} };
}

function openDb({ name, file, url, migrations = [] } = {}) {
  url = url || (name && process.env[`${name.toUpperCase()}_DATABASE_URL`]) || process.env.DATABASE_URL;
  const backend = url ? postgres(url, name) : process.env.VERCEL === '1' ? missing() : sqlite(file);
  // миграции — при первом обращении; если не вышло (база просыпалась, сеть), следующий запрос попробует снова
  let ready = null;
  const ensure = () => ready || (ready = backend.migrate(migrations).catch(e => {
    ready = null;
    console.error(`[db${name ? ':' + name : ''}] миграции не применены:`, e.message);
    throw Object.assign(e, { status: e.status || 503 });
  }));
  ensure().catch(() => {});
  return {
    kind: backend.kind,
    get ready() { return ensure(); },
    async all(sql, ...args) { await ensure(); return (await backend.query(sql, args)).rows; },
    async get(sql, ...args) { await ensure(); return (await backend.query(sql, args)).rows[0]; },
    async run(sql, ...args) { await ensure(); return backend.query(sql, args); },
    async batch(list) { await ensure(); return backend.batch(list); },
    close: () => backend.close(),
  };
}

module.exports = { openDb };
