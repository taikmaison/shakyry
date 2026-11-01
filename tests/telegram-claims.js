// Проверка «кода для клиента» и получателей ответов через бота с поддельным Telegram Bot API (без настоящего Telegram).
// 1) Поддельный Telegram — этот же скрипт (порт TG_PORT, по умолчанию 8399). 2) Тестовый сайт с ботом, смотрящим в него:
//   AUTH__TELEGRAM_BOT_TOKEN=test AUTH__TELEGRAM_API_URL=http://127.0.0.1:8399 AUTH__DEV_LOGIN_CODES=1 AUTH__DB_FILE=<тест>/auth.db ... node run.js --offset=100
//   BASE=http://127.0.0.1:8124 AUTH_DB=<тест>/auth.db node tests/telegram-claims.js
// Скрипт сначала поднимает поддельный Telegram и ждёт, пока бот к нему подключится (getMe/getUpdates).
const http = require('http');
const path = require('path');
const { execFileSync } = require('child_process');

const B = process.env.BASE || 'http://127.0.0.1:8124';
const TG_PORT = Number(process.env.TG_PORT || 8399);
let failed = 0;
const ok = (cond, msg) => { console.log(`${cond ? '✓' : '✗'} ${msg}`); if (!cond) failed++; };
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---------- поддельный Telegram Bot API ----------
const queue = [], sent = [];
let updateId = 1, polled = false;
http.createServer((req, res) => {
  let body = '';
  req.on('data', c => { body += c; });
  req.on('end', async () => {
    const method = req.url.split('/').pop();
    const p = body ? JSON.parse(body) : {};
    const reply = result => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ ok: true, result })); };
    if (method === 'getMe') return reply({ id: 1, is_bot: true, first_name: 'Test', username: 'test_bot' });
    if (method === 'sendMessage') { sent.push({ chat: p.chat_id, text: p.text }); return reply({ message_id: sent.length }); }
    if (method === 'getUpdates') {
      polled = true;
      for (let i = 0; i < 20 && !queue.length; i++) await sleep(100);
      return reply(queue.splice(0).filter(u => u.update_id >= (p.offset || 0)));
    }
    reply(true);   // deleteWebhook, getWebhookInfo и прочее
  });
}).listen(TG_PORT, '127.0.0.1');
const fromTg = (id, text, extra = {}) => queue.push({ update_id: updateId++, message: { message_id: updateId, date: 0, text, chat: { id, type: 'private' }, from: { id, is_bot: false, first_name: extra.name || 'Клиент', username: extra.username } } });
const waitSent = async (chat, re, ms = 8000) => {
  for (let t = 0; t < ms; t += 100) { const m = sent.find(s => s.chat === chat && re.test(s.text)); if (m) return m; await sleep(100); }
  return null;
};
// вход на сайт через Telegram: сайт выдаёт токен, «пользователь» отправляет боту /start <токен>, сайт выдаёт сессию
async function tgLogin(c, tgId, name) {
  const s = (await c.post('/api/auth/telegram/start')).body;
  fromTg(tgId, '/start ' + s.token, { name });
  for (let i = 0; i < 80; i++) {
    const r = await c.req('/api/auth/telegram/check?token=' + s.token);
    if (r.body && r.body.status === 'ok') return r.body.user;
    await sleep(100);
  }
  return null;
}

function client() {
  let sid = '';
  const req = async (p, opts = {}) => {
    const r = await fetch(B + p, { ...opts, headers: { ...(opts.headers || {}), ...(sid ? { cookie: 'sid=' + sid } : {}) } });
    const m = (r.headers.get('set-cookie') || '').match(/sid=([^;]*)/); if (m) sid = m[1];
    return { status: r.status, body: await r.json().catch(() => null) };
  };
  const post = (p, d) => req(p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d || {}) });
  return { req, post };
}

(async () => {
  for (let i = 0; i < 600 && !polled; i++) await sleep(100);
  ok(polled, 'бот подключился к поддельному Telegram');
  const run = Date.now().toString(36);
  const admin = client(), guest = client();
  const email = `admin-${run}@example.com`;
  const s = await admin.post('/api/auth/email/start', { email });
  await admin.post('/api/auth/email/verify', { email, code: s.body.dev_code, name: 'Админ' });
  execFileSync(process.execPath, ['--disable-warning=ExperimentalWarning', 'tools/make-admin.js', email, '--replace'],
    { cwd: path.join(__dirname, '..', 'services', 'auth'), env: { ...process.env, DB_FILE: process.env.AUTH_DB }, stdio: 'ignore' });
  await sleep(300);

  // админ делает приглашение «для клиента» и публикует
  const tid = (await guest.req('/api/templates')).body[0].id;
  const inv = (await admin.post('/api/invitations', { template_id: tid, title: 'Тест тойы', name1: 'Айбек', name2: 'Аружан', date: '2027-06-12', force: true })).body;
  await admin.post(`/api/invitations/${inv.id}/submit`, { agree: true });
  ok((await admin.post(`/api/admin/invitations/${inv.id}/approve`)).body.status === 'published', 'приглашение опубликовано админом');

  ok((await guest.post(`/api/admin/invitations/${inv.id}/claim`)).status === 401, 'код выдаёт только админ');
  const c1 = (await admin.post(`/api/admin/invitations/${inv.id}/claim`)).body;
  const c2 = (await admin.post(`/api/admin/invitations/${inv.id}/claim`)).body;
  ok(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(c2.code) && c2.link === `https://t.me/test_bot?start=c_${c2.code.replace('-', '')}`, `код ${c2.code} и ссылка на бота`);

  // прежний код не действует, неверный — тоже
  fromTg(501, c1.code);
  ok(!!await waitSent(501, /Код не найден/), 'прежний код отменён новым');
  fromTg(501, 'ZZZZ-ZZZZ');
  ok(!!await waitSent(501, /Код не найден/), 'неверный код — отказ');

  // клиент открывает ссылку (/start c_…)
  fromTg(777, `/start c_${c2.code.replace('-', '')}`, { name: 'Айнұр', username: 'ainur_test' });
  ok(!!await waitSent(777, /Дайын! «Тест тойы/), 'бот: приглашение теперь ваше');
  fromTg(888, c2.code.toLowerCase().replace('-', ' '), { name: 'Чужой' });
  ok(!!await waitSent(888, /пайдаланып қойған/), 'тот же код другому — отказ');

  // владелец меняется (сервис приглашений забирает отметку сам)
  await sleep(5200);
  const list = (await admin.req(`/api/admin/invitations?q=${inv.id}`)).body.invitations;
  const users = (await admin.req('/api/admin/users?q=ainur_test')).body.users;
  ok(users.length === 1 && list[0].user_id === users[0].id, 'приглашение перешло клиенту (новый пользователь из Telegram)');

  // ответы и пожелания гостей — клиенту в Telegram
  await guest.post(`/api/i/${inv.id}/rsvp`, { form_id: 'f-1', guest_key: 'guest-cccccccc', action_text: 'Иә, келемін', fields: { name: 'Гость А' } });
  ok(!!await waitSent(777, /Гость А — Придёт/), 'ответ гостя пришёл клиенту');
  await guest.post(`/api/i/${inv.id}/wishes`, { name: 'Гость Б', message: 'Бақытты болыңдар!' });
  ok(!!await waitSent(777, /💌 Гость Б: Бақытты болыңдар!/), 'пожелание пришло клиенту');

  // ---------- получатели ответов: клиент добавляет второго человека (супруга), админ — третьего ----------
  const owner = client(), viewer = client();
  ok(!!await tgLogin(owner, 777, 'Айнұр'), 'клиент вошёл на сайт через Telegram');
  ok((await guest.post(`/api/invitations/${inv.id}/viewers/code`)).status === 401, 'код получателя — только после входа');
  const vc = (await owner.post(`/api/invitations/${inv.id}/viewers/code`)).body;
  const vc2 = (await admin.post(`/api/invitations/${inv.id}/viewers/code`)).body;
  ok(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(vc.code) && /^[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(vc2.code), `коды получателей ${vc.code} (клиент) и ${vc2.code} (админ)`);
  fromTg(999, `/start c_${vc.code.replace('-', '')}`, { name: 'Ерлан', username: 'erlan_test' });
  ok(!!await waitSent(999, /сізге де/), 'бот получателю: ответы будут приходить и вам');
  fromTg(1001, vc2.code, { name: 'Гүлнәр' });
  ok(!!await waitSent(1001, /сізге де/), 'второй код не отменён первым — третий человек тоже добавлен');
  await sleep(5200);
  const vl = (await owner.req(`/api/invitations/${inv.id}/viewers`)).body;
  ok(vl.viewers.length === 2 && vl.viewers.some(v => /Ерлан @erlan_test/.test(v.name)), 'клиент видит двух получателей');
  ok(!!await waitSent(777, /Ерлан @erlan_test теперь тоже получает/), 'клиенту пришло, кто добавился');
  const adminSees = (await admin.req(`/api/admin/invitations?q=${inv.id}`)).body.invitations[0];
  ok(adminSees.user_id === users[0].id, 'владелец не сменился');

  // ответ гостя — владельцу и обоим получателям
  await guest.post(`/api/i/${inv.id}/rsvp`, { form_id: 'f-1', guest_key: 'guest-dddddddd', action_text: 'Иә, келемін', fields: { name: 'Гость В' } });
  ok(!!await waitSent(777, /Гость В — Придёт/) && !!await waitSent(999, /Гость В — Придёт/) && !!await waitSent(1001, /Гость В — Придёт/),
    'ответ гостя пришёл владельцу и обоим получателям');

  // получатель на сайте: видит приглашение и ответы, менять не может
  const vu = await tgLogin(viewer, 999, 'Ерлан');
  ok(!!vu, 'получатель вошёл через Telegram');
  const vlist = (await viewer.req('/api/invitations')).body;
  ok(vlist.length === 1 && vlist[0].id === inv.id && vlist[0].shared === true && !('moderation_note' in vlist[0]), 'получатель видит приглашение — только просмотр');
  ok((await viewer.req(`/api/i/${inv.id}/answers`)).status === 200 && (await viewer.req(`/api/i/${inv.id}/answers.csv`)).status === 200, 'получатель видит ответы гостей и таблицу');
  const st = (await viewer.req(`/api/guests/stats?ids=${inv.id}`)).body;
  ok(st[inv.id] && st[inv.id].answers >= 2, 'счётчики ответов — и получателю');
  ok((await viewer.req(`/api/invitations/${inv.id}/viewers`)).status === 403, 'список получателей — только владельцу');
  ok((await viewer.post(`/api/invitations/${inv.id}/viewers/code`)).status === 403, 'новый код — только владельцу');
  ok((await viewer.req(`/api/invitations/${inv.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ template_id: tid, title: 'Чужая правка', date: '2027-06-12' }) })).status === 403, 'менять приглашение получатель не может');
  ok((await viewer.req(`/api/invitations/${inv.id}/draft`)).status === 403, 'черновик владельца получателю не виден');
  // владелец правит опубликованное (новая версия ждёт модерации) — получатель видит то же, что гости, а не черновик
  ok((await owner.req(`/api/invitations/${inv.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ template_id: tid, title: 'Жаңа атау', name1: 'Айбек', name2: 'Аружан', date: '2027-07-01' }) })).status === 200, 'клиент поправил приглашение');
  const afterEdit = (await viewer.req('/api/invitations')).body[0];
  ok(afterEdit.fields.title === 'Тест тойы' && afterEdit.fields.date === '2027-06-12' && !('status' in afterEdit), 'получателю — одобренная версия, не правка');
  const wl = (await guest.req(`/api/i/${inv.id}/wishes`)).body;
  ok((await viewer.req(`/api/i/${inv.id}/wishes/${wl[0].id}`, { method: 'DELETE' })).status === 403, 'удалять пожелания получатель не может');
  const g1001 = vl.viewers.find(v => !/Ерлан/.test(v.name));
  ok((await viewer.req(`/api/invitations/${inv.id}/viewers/${g1001.user_id}`, { method: 'DELETE' })).status === 403, 'убрать другого получателя не может');
  ok((await viewer.req(`/api/invitations/${inv.id}`, { method: 'DELETE' })).status === 403, 'удалить приглашение не может');

  // клиент убирает третьего, получатель отписывается сам — уведомления и доступ пропадают
  ok((await owner.req(`/api/invitations/${inv.id}/viewers/${g1001.user_id}`, { method: 'DELETE' })).status === 200, 'клиент убрал получателя');
  ok((await viewer.req(`/api/invitations/${inv.id}/viewers/${vu.id}`, { method: 'DELETE' })).status === 200, 'получатель отписался сам');
  ok((await viewer.req(`/api/i/${inv.id}/answers`)).status === 403 && !(await viewer.req('/api/invitations')).body.length, 'после этого приглашение и ответы ему не видны');
  const before = sent.length;
  await guest.post(`/api/i/${inv.id}/rsvp`, { form_id: 'f-1', guest_key: 'guest-eeeeeeee', action_text: 'Келе алмаймын', fields: { name: 'Гость Г' } });
  ok(!!await waitSent(777, /Гость Г/), 'ответ гостя — владельцу');
  await sleep(500);
  ok(!sent.slice(before).some(s => (s.chat === 999 || s.chat === 1001) && /Гость Г/.test(s.text)), 'убранным получателям больше не приходит');
  // убранный открывает старую ссылку снова — код уже использован, обратно не добавляется
  fromTg(1001, `/start c_${vc2.code.replace('-', '')}`, { name: 'Гүлнәр' });
  ok(!!await waitSent(1001, /пайдаланылған/), 'старый код после удаления: «код уже использован»');
  await sleep(5200);
  ok(!(await owner.req(`/api/invitations/${inv.id}/viewers`)).body.viewers.length, 'и в получатели не вернулся');
  // владелец по своей же ссылке — не становится «получателем», лишних сообщений нет
  const own = (await owner.post(`/api/invitations/${inv.id}/viewers/code`)).body;
  const sentBefore = sent.length;
  fromTg(777, own.code);
  ok(!!await waitSent(777, /сізге де/), 'владелец открыл свою ссылку — бот отвечает');
  await sleep(5200);
  ok(!(await owner.req(`/api/invitations/${inv.id}/viewers`)).body.viewers.length && !sent.slice(sentBefore).some(s => /теперь тоже получает/.test(s.text)),
    'владелец не стал своим же получателем и не получил «кто добавился»');

  console.log(failed ? `\nОшибок: ${failed}` : '\nВсё работает.');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
