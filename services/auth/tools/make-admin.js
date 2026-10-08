// Назначить администратора сайта — единственный способ: через API роль не меняется.
// Администратор ровно один. Пользователь должен уже существовать — сначала войдите на сайт.
//
//   node tools/make-admin.js <почта | telegram id | @ник>             назначить (если админа ещё нет)
//   node tools/make-admin.js <почта | telegram id | @ник> --replace   передать роль: прежний админ станет user
//
// Работает напрямую с базой сервиса (DB_FILE или data/auth.db); сервис можно не останавливать.

// node:sqlite пока экспериментальный — не показываем об этом предупреждение
const emitWarning = process.emitWarning;
process.emitWarning = (w, ...rest) => (/SQLite/i.test(String((w && w.message) || w)) ? undefined : emitWarning.call(process, w, ...rest));

const { openStore, dbFile, normalizeEmail } = require('../src/store');

const fail = (msg, code = 1) => { console.error(msg); process.exit(code); };
const args = process.argv.slice(2);
const replace = args.includes('--replace');
const who = args.filter(a => a !== '--replace').join('').trim();   // «+7 …» и пробелы склеиваем
if (!who) {
  fail('Использование: node tools/make-admin.js <почта | telegram id | @ник> [--replace]\n'
    + 'Пример: node tools/make-admin.js @erkebai1225', 2);
}

const db = openStore();
const describe = u => `#${u.id} «${u.name}»` + [
  u.email,
  u.telegram_username && '@' + u.telegram_username,
  u.telegram_id && `telegram id ${u.telegram_id}`,
].filter(Boolean).map(s => ` ${s}`).join(',');

// кого назначаем
let user;
if (/^@[A-Za-z0-9_]{1,64}$/.test(who)) {
  // ник Telegram без учёта регистра; роль ляжет на запись пользователя (по сути — на его telegram id)
  const found = db.all('SELECT * FROM users WHERE lower(telegram_username) = lower(?) ORDER BY updated_at DESC', who.slice(1));
  if (!found.length) fail(`Пользователь ${who} не найден. Сначала войдите на сайт через Telegram.`);
  if (found.length > 1) fail(`Ник ${who} есть у нескольких пользователей — укажите числовой telegram id:\n` + found.map(u => '  ' + describe(u)).join('\n'));
  user = found[0];
} else if (/^\d{1,16}$/.test(who)) {
  user = db.get('SELECT * FROM users WHERE telegram_id = ?', Number(who));
  if (!user) fail(`Пользователь с telegram id ${who} не найден. Сначала войдите на сайт через Telegram.`);
} else if (who.includes('@')) {
  const email = normalizeEmail(who);
  if (!email) fail(`Некорректный адрес почты: ${who}`, 2);
  user = db.get('SELECT * FROM users WHERE email = ?', email);
  if (!user) fail(`Пользователь с почтой ${email} не найден. Сначала войдите на сайт по этой почте.`);
} else {
  fail(`Не понимаю «${who}»: укажите почту, числовой telegram id или @ник Telegram.`, 2);
}

const current = db.get("SELECT * FROM users WHERE role = 'admin'");
if (current && current.id === user.id) {
  console.log(`${describe(user)} уже администратор.`);
  process.exit(0);
}
if (current && !replace) {
  fail(`Администратор уже есть: ${describe(current)}.\nЧтобы передать роль, повторите с флагом --replace.`);
}

const now = new Date().toISOString();
db.tx(() => {
  if (current) db.run("UPDATE users SET role = 'user', updated_at = ? WHERE id = ?", now, current.id);
  db.run("UPDATE users SET role = 'admin', blocked = 0, updated_at = ? WHERE id = ?", now, user.id);
});
db.close();

if (current) console.log(`Прежний администратор ${describe(current)} теперь обычный пользователь.`);
console.log(`Администратор: ${describe(user)}${user.blocked ? ' (был заблокирован — разблокирован)' : ''}.`);
console.log(`База: ${dbFile()}`);
