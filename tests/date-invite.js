// Приглашение на свидание (шаблон с guest_date, анкета с календарём): только для ТЕСТОВОГО запуска с пустыми базами.
//   AUTH__DEV_LOGIN_CODES=1 AUTH__DB_FILE=<тест>/auth.db ... node run.js --offset=100
//   BASE=http://127.0.0.1:8124 AUTH_DB=<тест>/auth.db [TID=9031] node tests/date-invite.js
// Проверяет: черновик без даты для такого шаблона сохраняется (а для обычного — нет), публикация,
// в браузере девушка открывает обложку, выбирает день в окне-календаре и отправляет; хозяин видит её имя и дату.
const path = require('path');
const { execFileSync } = require('child_process');
const puppeteer = require(path.join(__dirname, '..', 'services', 'catalog', 'tools', 'node_modules', 'puppeteer'));

const B = process.env.BASE || 'http://127.0.0.1:8124';
const TID = Number(process.env.TID || 9031);
let failed = 0;
const ok = (cond, msg) => { console.log(`${cond ? '✓' : '✗'} ${msg}`); if (!cond) failed++; };

function client() {
  let sid = '';
  const req = async (p, opts = {}) => {
    const r = await fetch(B + p, { ...opts, headers: { ...(opts.headers || {}), ...(sid ? { cookie: 'sid=' + sid } : {}) }, redirect: 'manual' });
    const m = (r.headers.get('set-cookie') || '').match(/sid=([^;]*)/);
    if (m) sid = m[1];
    const type = r.headers.get('content-type') || '';
    return { status: r.status, body: type.includes('json') ? await r.json() : await r.text() };
  };
  const send = (method, p, data) => req(p, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data || {}) });
  return { req, post: (p, d) => send('POST', p, d) };
}
async function login(c, email) {
  const s = await c.post('/api/auth/email/start', { email });
  if (!s.body.dev_code) throw new Error('нет dev_code: запустите тестовый auth с DEV_LOGIN_CODES=1');
  return (await c.post('/api/auth/email/verify', { email, code: s.body.dev_code })).body.user;
}

(async () => {
  if (!process.env.AUTH_DB) throw new Error('укажите AUTH_DB — путь к auth.db тестового сайта');
  const run = Date.now().toString(36), owner = client(), admin = client();

  const info = await owner.req(`/api/templates/${TID}`);
  ok(info.status === 200 && info.body.category === 'svidanie' && !info.body.tokens.includes('date'), `шаблон #${TID}: свидание, даты в форме нет (${(info.body.tokens || []).join(', ')})`);
  await login(owner, `date-owner-${run}@example.com`);
  const fields = { template_id: TID, title: 'Приглашение на свидание', name1: 'Дана', hosts: 'Мерейбек', time: '21:00', city: 'Атырау',
    address: 'Bonasera, ул. Айтеке би, 75', map_link: 'https://2gis.kz/atyrau/firm/70000001063109371', invite_text: 'Приглашаю тебя на ужин.' };
  const draft = await owner.post('/api/invitations', fields);
  ok(draft.status === 200 || draft.status === 201, `черновик без даты сохраняется (${draft.status})`);
  const other = (await owner.req('/api/templates')).body.find(t => !t.own);
  const noDate = await owner.post('/api/invitations', { ...fields, template_id: other.id });
  ok(noDate.status === 400 && /дату/i.test(noDate.body.error || ''), `обычный шаблон #${other.id} без даты — «${noDate.body.error}»`);
  const id = draft.body.id;

  // публикация: админ (тестовая база, единственный админ заменяется)
  const adminEmail = `date-admin-${run}@example.com`;
  await login(admin, adminEmail);
  execFileSync(process.execPath, ['--disable-warning=ExperimentalWarning', 'tools/make-admin.js', adminEmail, '--replace'],
    { cwd: path.join(__dirname, '..', 'services', 'auth'), env: { ...process.env, DB_FILE: process.env.AUTH_DB }, stdio: 'pipe' });
  await owner.post(`/api/invitations/${id}/submit`, { agree: true });
  const ap = await admin.post(`/api/admin/invitations/${id}/approve`, {});
  ok(ap.status === 200, `опубликовано (${ap.status})`);

  // девушка: обложка → календарь → отправить
  const browser = await puppeteer.launch({ headless: 'shell' });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${B}/i/${id}`, { waitUntil: 'networkidle2' });
  const cover = await page.evaluate(() => { const e = document.querySelector('.env'); return e && { cover: e.classList.contains('cover'), bg: getComputedStyle(e.querySelector('.paper')).backgroundImage, kicker: !!e.querySelector('.kicker'), ttl: (e.querySelector('.ttl') || {}).textContent }; });
  ok(cover && cover.cover && /svidanie-cover/.test(cover.bg) && !cover.kicker && cover.ttl === 'Приглашение на свидание', `обложка-картинка без «Вам приглашение»: ${JSON.stringify(cover)}`);
  // на невысоком экране (360×640) надпись на обложке не должна сжиматься до минимума
  const small = await browser.newPage();
  await small.setViewport({ width: 360, height: 640, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  await small.goto(`${B}/i/${id}`, { waitUntil: 'networkidle2' });
  await small.evaluate(() => document.fonts.ready);
  const fit = await small.evaluate(() => { const t = document.querySelector('.env .ttl'), n = document.querySelector('.env .names'), s = document.querySelector('.env .seal').getBoundingClientRect();
    return { ttl: parseFloat(getComputedStyle(t).fontSize), names: parseFloat(getComputedStyle(n).fontSize), top: document.querySelector('.env .top').getBoundingClientRect().top, gap: s.top - document.querySelector('.env .top').getBoundingClientRect().bottom }; });
  ok(fit.ttl >= 40 && fit.names >= 24 && fit.top >= 0 && fit.gap >= 0, `обложка на 360×640: название ${fit.ttl}px, имя ${fit.names}px, до печати ${Math.round(fit.gap)}px`);
  await small.close();
  await page.click('.seal'); await new Promise(r => setTimeout(r, 1900));
  ok(!(await page.$('.env')), 'обложка открылась');
  await page.$eval('.datefield', e => e.scrollIntoView({ block: 'center' }));
  await page.click('.datefield'); await new Promise(r => setTimeout(r, 300));
  const dp = await page.evaluate(() => { const d = document.querySelector('.modal .dp'); return d && { title: document.querySelector('.modal h3').textContent, past: d.querySelectorAll('.day:disabled').length, free: d.querySelectorAll('.day:not(:disabled)').length }; });
  ok(dp && dp.title === 'Выбери день свидания' && dp.free > 0, `окно-календарь: ${JSON.stringify(dp)}`);
  // следующий месяц, 15-е
  await page.click('.modal .dp .nav:last-child'); await new Promise(r => setTimeout(r, 150));
  const head = await page.$eval('.modal .dp .head b', e => e.textContent);
  const days = await page.$$('.modal .dp .day');
  await days[14].click(); await new Promise(r => setTimeout(r, 300));
  const shown = await page.$eval('.datefield', e => e.textContent.trim());
  ok(/^15 [а-я]+ \d{4}, [а-я]+$/.test(shown) && !(await page.$('.modal')), `выбрано: «${shown}» (${head}), окно закрылось`);
  await page.evaluate(() => [...document.querySelectorAll('.form .submit')].pop().click());
  await new Promise(r => setTimeout(r, 1200));
  const done = await page.evaluate(() => (document.querySelector('.form .done') || {}).textContent || '');
  ok(/Дата выбрана/.test(done), `после отправки: «${done.trim()}»`);
  ok(!errors.length, 'без ошибок на странице' + (errors.length ? ': ' + errors.join('; ') : ''));
  await browser.close();

  const ans = await owner.req(`/api/i/${id}/answers`);
  const a = ans.body.answers && ans.body.answers[0];
  ok(a && a.status === 'yes' && a.fields['Имя'] === 'Дана' && a.fields['Дата свидания'] === shown, `хозяин видит ответ: ${JSON.stringify(a && { status: a.status, fields: a.fields })}`);

  console.log(failed ? `\nОшибок: ${failed}` : '\nВсё работает.');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
