// Сквозная проверка всех сервисов через шлюз. Только для ТЕСТОВОГО запуска с пустыми базами:
//   AUTH__DEV_LOGIN_CODES=1 AUTH__DB_FILE=<тест>/auth.db ... node run.js --offset=100
//   BASE=http://127.0.0.1:8124 AUTH_DB=<тест>/auth.db node tests/smoke.js
// Вход — по коду на почту (DEV_LOGIN_CODES=1 возвращает код в ответе).
// Админа тест назначает сам через services/auth/tools/make-admin.js в базе AUTH_DB;
// без AUTH_DB (или если админ в этой базе уже есть) шаги модерации пропускаются.
const path = require('path');
const { execFileSync } = require('child_process');

const B = process.env.BASE || 'http://127.0.0.1:8024';
let failed = 0, skipped = 0;
const ok = (cond, msg) => { console.log(`${cond ? '✓' : '✗'} ${msg}`); if (!cond) failed++; };
const sleep = ms => new Promise(r => setTimeout(r, ms));

// клиент со своей cookie — как отдельный браузер
function client() {
  let sid = '';
  const req = async (p, opts = {}) => {
    const headers = { ...(opts.headers || {}), ...(sid ? { cookie: 'sid=' + sid } : {}) };
    const r = await fetch(B + p, { ...opts, headers, redirect: 'manual' });
    const set = r.headers.get('set-cookie');
    const m = set && set.match(/sid=([^;]*)/);
    if (m) sid = m[1];
    const type = r.headers.get('content-type') || '';
    return { status: r.status, type, body: type.includes('json') ? await r.json() : await r.text() };
  };
  const send = (method, p, data) => req(p, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data || {}) });
  return { req, post: (p, d) => send('POST', p, d), put: (p, d) => send('PUT', p, d), patch: (p, d) => send('PATCH', p, d), del: p => req(p, { method: 'DELETE' }), get sid() { return sid; } };
}
async function login(c, email) {
  const start = await c.post('/api/auth/email/start', { email });
  if (!start.body.dev_code) throw new Error(`нет dev_code (${start.status}): запустите тестовый auth с DEV_LOGIN_CODES=1`);
  const v = await c.post('/api/auth/email/verify', { email, code: start.body.dev_code });
  return v.body.user;
}

(async () => {
  const run = Date.now().toString(36);
  const guest = client(), owner = client(), other = client(), admin = client();

  // ---------- каталог и страницы ----------
  const cat = await guest.req('/api/templates');
  ok(cat.status === 200 && cat.body.length > 0, `каталог: ${cat.body.length} шаблонов`);
  const tid = cat.body[0].id;
  const info = await guest.req(`/api/templates/${tid}`);
  ok(info.status === 200 && Array.isArray(info.body.tokens), `шаблон #${tid}: поля ${info.body.tokens.join(', ')}`);
  const rendered = await guest.post(`/api/templates/${tid}/render`, { fields: { name1: 'Айдос', date: '2027-06-12' } });
  ok(rendered.status === 200 && JSON.stringify(rendered.body.blocks).includes('Айдос'), 'сборка приглашения в каталоге');
  ok((await guest.req('/api/music')).status === 200 && (await guest.req('/fonts.css')).status === 200, 'музыка и шрифты');
  ok((await guest.req('/')).status === 200 && (await guest.req(`/t/${tid}`)).status === 200, 'главная и пример шаблона');
  ok((await guest.req('/kz/')).status === 200 && (await guest.req('/ru/wedding/')).status === 200, 'посадочные страницы');
  ok((await guest.req('/robots.txt')).status === 200 && (await guest.req('/sitemap.xml')).status === 200, 'robots.txt и sitemap.xml');
  const prev = await guest.req('/preview', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ template_id: tid, name1: 'Айдос', date: '2027-06-12' }) });
  ok(prev.status === 200 && prev.body.includes('Айдос'), 'предпросмотр без входа');

  // ---------- шлюз: служебное снаружи закрыто ----------
  ok((await guest.post('/events', { type: 'invitation.deleted', id: 'x' })).status === 404, '/events снаружи закрыт');
  ok((await guest.post('/_internal/notify-admins', { text: 'x' })).status === 404, '/_internal снаружи закрыт');
  ok([400, 404].includes((await guest.req('/api/templates/..%2f..%2fetc')).status), 'обход пути через %2f отклонён');

  // ---------- вход ----------
  const providers = await guest.req('/api/auth/providers');
  ok(providers.status === 200 && 'telegram' in providers.body, `способы входа: почта ${providers.body.email}, Telegram ${providers.body.telegram}`);
  ok((await guest.req('/api/auth/me')).status === 401, 'без входа /me — 401');
  ok((await guest.post('/api/invitations', { template_id: tid, date: '2027-06-12' })).status === 401, 'черновик без входа не сохраняется');
  ok((await guest.post('/api/auth/email/verify', { email: `x-${run}@example.com`, code: '000000' })).status >= 400, 'неверный код не пускает');
  const ownerUser = await login(owner, `owner-${run}@example.com`);
  ok(ownerUser && ownerUser.role === 'user', `вход по почте: #${ownerUser && ownerUser.id}, роль user`);
  ok((await owner.req('/api/auth/me')).body.user.id === ownerUser.id, 'сессия держится по cookie');
  const otherUser = await login(other, `other-${run}@example.com`);

  // ---------- черновик ----------
  ok((await owner.post('/api/invitations', { template_id: 999999, date: '2027-01-01' })).status === 400, 'несуществующий шаблон отклонён');
  ok((await owner.post('/api/invitations', { template_id: tid, date: '2027-02-30' })).status === 400, 'несуществующая дата отклонена');
  const created = await owner.post('/api/invitations', { template_id: tid, title: 'Тест', name1: 'Айдос', name2: 'Аружан', date: '2027-06-12', time: '18:00', city: 'Алматы', address: 'Абая 1', invite_text: 'Тест' });
  ok(created.status === 200 && created.body.status === 'draft', `черновик сохранён: ${created.body.id}`);
  const id = created.body.id;
  ok((await owner.req('/api/invitations')).body.some(x => x.id === id), 'черновик в «Мои приглашения»');
  // защита от дублей
  const again = await owner.post('/api/invitations', { template_id: tid, title: 'Тест', name1: 'Айдос', name2: 'Аружан', date: '2027-06-12', time: '18:00', city: 'Алматы', address: 'Абая 1', invite_text: 'Тест' });
  ok(again.status === 200 && again.body.id === id && again.body.duplicate, 'повторное сохранение того же — без копии');
  const [d1, d2] = await Promise.all([1, 2].map(() => owner.post('/api/invitations', { template_id: tid, name1: 'Двойной', date: '2027-07-01' })));
  ok(d1.status === 409 && d2.status === 409 && d1.body.existing.id === id, 'другое приглашение на том же шаблоне — сначала спрашиваем (409)');
  const forced = await owner.post('/api/invitations', { template_id: tid, name1: 'Второе', date: '2027-07-01', force: true });
  ok(forced.status === 200 && forced.body.id !== id, 'после подтверждения второе создаётся');
  const [f1, f2] = await Promise.all([1, 2].map(() => owner.post('/api/invitations', { template_id: tid, name1: 'Второе', date: '2027-07-01', force: true })));
  ok(f1.body.id === forced.body.id && f2.body.id === forced.body.id, 'двойное нажатие не создаёт копию');
  ok((await owner.req('/api/invitations')).body.length === 2, 'у автора ровно 2 приглашения');
  await owner.del(`/api/invitations/${forced.body.id}`);
  ok((await other.req('/api/invitations')).body.every(x => x.id !== id), 'чужие черновики не видны');
  ok((await guest.req(`/api/invitations/${id}`)).status === 404, 'черновик закрыт для всех');
  ok((await guest.req(`/i/${id}`)).status === 404, 'страница черновика для гостя — «не опубликовано»');
  const own = await owner.req(`/i/${id}?draft`);
  ok(own.status === 200 && own.body.includes('Аружан'), 'владелец видит свой черновик');
  ok((await other.req(`/i/${id}?draft`)).status === 404 && (await other.put(`/api/invitations/${id}`, { template_id: tid, date: '2027-06-12' })).status === 403, 'чужой не видит и не меняет черновик');
  ok((await guest.post(`/api/i/${id}/rsvp`, { form_id: 'f-1', action_text: 'Иә, келемін' })).status >= 400, 'ответ на неопубликованное не принимается');

  // ---------- модерация ----------
  ok((await owner.post(`/api/invitations/${id}/submit`)).status === 400, 'без согласия с правилами на публикацию не отправить');
  const sub = await owner.post(`/api/invitations/${id}/submit`, { agree: true });
  ok(sub.status === 200 && sub.body.status === 'pending' && sub.body.terms_accepted_at, 'отправлено на публикацию, согласие записано');
  ok((await owner.post(`/api/invitations/${id}/submit`, { agree: true })).status === 409, 'повторная отправка — 409');
  ok((await owner.req('/api/admin/invitations')).status === 403, 'обычный пользователь не видит админку');
  ok((await owner.post(`/api/admin/invitations/${id}/approve`)).status === 403, 'обычный пользователь не может одобрить');
  ok((await owner.patch('/api/auth/me', { role: 'admin' })).body.user.role === 'user', 'роль себе не назначить');

  let adminOk = false;
  if (process.env.AUTH_DB) {
    const adminEmail = `admin-${run}@example.com`;
    await login(admin, adminEmail);
    try {
      execFileSync(process.execPath, ['--disable-warning=ExperimentalWarning', 'tools/make-admin.js', adminEmail], { cwd: path.join(__dirname, '..', 'services', 'auth'), env: { ...process.env, DB_FILE: process.env.AUTH_DB }, stdio: 'pipe' });
      adminOk = true;
    } catch (e) { console.log(`– админ не назначен (${String(e.stderr || e.message).trim().split('\n')[0]}) — шаги модерации пропущены`); }
    if (adminOk) {
      const again = (() => { try { execFileSync(process.execPath, ['--disable-warning=ExperimentalWarning', 'tools/make-admin.js', `owner-${run}@example.com`], { cwd: path.join(__dirname, '..', 'services', 'auth'), env: { ...process.env, DB_FILE: process.env.AUTH_DB }, stdio: 'pipe' }); return true; } catch { return false; } })();
      ok(!again, 'второго админа без --replace не назначить');
    }
  } else console.log('– AUTH_DB не задан — шаги модерации пропущены');

  if (adminOk) {
    await sleep(100);
    ok((await admin.req('/api/auth/me')).body.user.role === 'admin', 'админ назначен командой на сервере');
    const queue = await admin.req('/api/admin/invitations?status=pending');
    ok(queue.status === 200 && queue.body.invitations.some(x => x.id === id), `очередь модерации: ${queue.body.counts && queue.body.counts.pending}`);
    ok((await admin.req(`/i/${id}?draft`)).status === 200, 'админ видит черновик на модерации');
    ok((await admin.req('/admin')).status === 200, 'страница админки');
    const rej = await admin.post(`/api/admin/invitations/${id}/reject`, { reason: 'Проверьте дату' });
    ok(rej.status === 200 && rej.body.status === 'rejected', 'отклонено с причиной');
    ok((await owner.req('/api/invitations')).body.find(x => x.id === id).moderation_note === 'Проверьте дату', 'владелец видит причину');
    await owner.post(`/api/invitations/${id}/submit`, { agree: true });
    const appr = await admin.post(`/api/admin/invitations/${id}/approve`);
    ok(appr.status === 200 && appr.body.status === 'published', 'одобрено');

    const page = await guest.req(`/i/${id}`);
    ok(page.status === 200 && page.body.includes('Аружан') && /noindex/.test(page.body), 'гость видит опубликованное (noindex)');

    // ---------- гости: ответы ----------
    ok((await guest.post(`/api/i/${id}/rsvp`, { form_id: 'f-1', guest_key: 'guest-aaaaaaaa', action_text: 'Иә, келемін', fields: { name: 'Гость 1' } })).body.status === 'yes', 'ответ «приду» распознан');
    ok((await guest.post(`/api/i/${id}/rsvp`, { form_id: 'f-1', guest_key: 'guest-aaaaaaaa', action_text: 'Өкінішке орай, келе алмаймын', fields: { name: 'Гость 1' } })).body.status === 'no', 'ответ «не приду» распознан');
    ok((await guest.post(`/api/i/${id}/rsvp`, { form_id: 'f-1', guest_key: 'guest-bbbbbbbb', action_text: 'Жұбайыммен бірге келемін', fields: { name: 'Гость 2' } })).body.status === 'plus_one', 'ответ «с парой» распознан');
    ok((await guest.req(`/api/i/${id}/answers`)).status === 401 && (await other.req(`/api/i/${id}/answers`)).status === 403, 'ответы не видны гостю и чужому');
    const ans = await owner.req(`/api/i/${id}/answers`);
    const s = ans.body.summary || {};
    ok(ans.status === 200 && ans.body.answers.length === 2, 'повторный ответ гостя заменил прежний (2 ответа, не 3)');
    ok(s.yes === 0 && s.no === 1 && s.plus_one === 1 && s.people === 2, `сводка: придут ${s.people} чел., не придут ${s.no}`);
    const csv = await owner.req(`/api/i/${id}/answers.csv`);
    ok(csv.status === 200 && csv.body.includes('Гость 2'), 'выгрузка ответов в CSV');

    ok((await guest.post(`/api/i/${id}/wishes`, { name: 'Гость', message: 'Бақытты болыңдар!' })).status === 200, 'пожелание');
    const wishes = await guest.req(`/api/i/${id}/wishes`);
    ok(wishes.body.length === 1 && wishes.body[0].message === 'Бақытты болыңдар!', 'пожелание видно в списке');

    // ---------- альбом ----------
    const fd = new FormData();
    fd.append('file', new Blob([Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64')], { type: 'image/gif' }), 'p.gif');
    fd.append('name', 'Гость');
    ok((await guest.req(`/api/i/${id}/album`, { method: 'POST', body: fd })).status === 200, 'фото загружено');
    const bad = new FormData();
    bad.append('file', new Blob(['<script>alert(1)</script>'], { type: 'image/png' }), 'x.png');
    ok((await guest.req(`/api/i/${id}/album`, { method: 'POST', body: bad })).status === 400, 'не-картинка отклонена');
    const photos = await guest.req(`/api/i/${id}/album`);
    ok(photos.body.length === 1 && (await guest.req(photos.body[0].url)).status === 200, 'фото открывается');
    ok((await guest.del(`/api/i/${id}/album/${photos.body[0].id}`)).status === 401, 'гость не может удалить фото');
    ok((await guest.req(`/i/${id}/album`)).status === 200, 'страница альбома');

    // ---------- правка после публикации ----------
    const edit = await owner.put(`/api/invitations/${id}`, { template_id: tid, title: 'Тест', name1: 'Айдос', name2: 'Камила', date: '2027-06-12' });
    ok(edit.status === 200 && edit.body.status === 'draft' && edit.body.live, 'правка → новый черновик, одобренная версия остаётся');
    const still = await guest.req(`/i/${id}`);
    ok(still.body.includes('Аружан') && !still.body.includes('Камила'), 'гости видят одобренную версию, не правку');

    // ---------- пользователи ----------
    const users = await admin.req(`/api/admin/users?q=${encodeURIComponent('other-' + run)}`);
    ok(users.status === 200 && users.body.users.length === 1, 'поиск пользователя');
    ok((await admin.patch(`/api/admin/users/${otherUser.id}`, { role: 'admin' })).status === 400, 'роль через API не меняется');
    const meAdmin = (await admin.req('/api/auth/me')).body.user;
    ok((await admin.patch(`/api/admin/users/${meAdmin.id}`, { blocked: true })).status === 400, 'админа не заблокировать');
    ok((await admin.patch(`/api/admin/users/${otherUser.id}`, { blocked: true })).body.user.blocked === true, 'пользователь заблокирован');
    ok((await other.req('/api/auth/me')).status === 401, 'сессия заблокированного закрыта');

    // ---------- снятие с публикации ----------
    await admin.post(`/api/admin/invitations/${id}/unpublish`, { reason: 'тест' });
    ok((await guest.req(`/api/invitations/${id}`)).status === 404, 'снято с публикации — гостям закрыто');
  } else skipped++;

  // ---------- удаление ----------
  ok((await other.del(`/api/invitations/${id}`)).status >= 401, 'чужой не может удалить');
  ok((await owner.del(`/api/invitations/${id}`)).status === 200, 'приглашение удалено');
  await sleep(500);
  ok((await owner.req(`/i/${id}?draft`)).status === 404, 'удалённое не открывается');
  const g2 = await guest.req(`/api/guests/stats?ids=${id}`), a2 = await guest.req(`/api/album/stats?ids=${id}`);
  ok(g2.body[id].answers === 0 && g2.body[id].wishes === 0 && a2.body[id].photos === 0, 'событие удаления дошло: ответы и фото удалены');

  ok((await owner.post('/api/auth/logout')).status === 200 && (await owner.req('/api/auth/me')).status === 401, 'выход');

  console.log(failed ? `\nОшибок: ${failed}` : `\nВсё работает${skipped ? ' (модерация пропущена)' : ''}.`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
