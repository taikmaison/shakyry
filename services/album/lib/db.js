// База данных сервиса: встроенная в Node SQLite (node:sqlite), файл — в папке сервиса.
// Интерфейс намеренно маленький (all / get / run / tx), чтобы при публикации заменить на PostgreSQL.
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

function openDb(file, migrations) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 3000;');
  // миграции по порядку: номер версии хранится в user_version
  const version = db.prepare('PRAGMA user_version').get().user_version;
  migrations.forEach((sql, i) => {
    if (i < version) return;
    db.exec('BEGIN');
    try { db.exec(sql); db.exec(`PRAGMA user_version = ${i + 1}`); db.exec('COMMIT'); }
    catch (e) { db.exec('ROLLBACK'); throw e; }
  });
  const stmts = new Map();
  const prep = sql => { if (!stmts.has(sql)) stmts.set(sql, db.prepare(sql)); return stmts.get(sql); };
  return {
    all: (sql, ...args) => prep(sql).all(...args),
    get: (sql, ...args) => prep(sql).get(...args),
    run: (sql, ...args) => prep(sql).run(...args),
    tx(fn) {
      db.exec('BEGIN');
      try { const r = fn(); db.exec('COMMIT'); return r; } catch (e) { db.exec('ROLLBACK'); throw e; }
    },
    close: () => db.close(),
  };
}

module.exports = { openDb };
