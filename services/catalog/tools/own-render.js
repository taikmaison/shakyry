// Снимки своих шаблонов с примером данных (как на телефоне 390 px): полная страница и шапка крупно.
//   node tools/own-render.js <папка> <id> [id…]      — нужен тестовый сайт (BASE, по умолчанию http://127.0.0.1:8324)
// Результат: <папка>/<id>-full.png (вся страница), <id>-top.png (первый экран, ×2), строка «тексты влезли» или что не влезло.
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const BASE = process.env.BASE || 'http://127.0.0.1:8324';
const [outDir, ...ids] = process.argv.slice(2);
if (!outDir || !ids.length) { console.error('node tools/own-render.js <папка> <id> [id…]'); process.exit(2); }
fs.mkdirSync(outDir, { recursive: true });

// примеры данных по видам тоя (придуманные)
const SAMPLE = {
  tusaukeser: { name1: 'Айсұлу', hosts: 'Ата-анасы: Ерлан – Гүлнұр', invite_text: 'Сіздерді қызымыз Айсұлудың тұсаукесер тойына арналған ақ дастарханымыздың қадірлі қонағы болуға шақырамыз!' },
  as_beru: { name1: 'Әбдіғаппар Сәрсенбайұлы', hosts: 'Балалары мен немерелері', invite_text: 'Әкеміз Әбдіғаппардың бір жылдық асын беретінімізді хабарлап, Сіздерді Құран бағыштауға шақырамыз.' },
  besik: { name1: 'Нұрислам', hosts: 'Ата-әжесі: Серік – Ғалия', invite_text: 'Сіздерді немереміз Нұрисламның бесік тойына арналған ақ дастарханымыздың қадірлі қонағы болуға шақырамыз!' },
  sundet: { name1: 'Әлихан', hosts: 'Ата-анасы: Нұржан – Әсем', invite_text: 'Сіздерді ұлымыз Әлиханның сүндет тойына арналған ақ дастарханымыздың қадірлі қонағы болуға шақырамыз!' },
  syrga_salu: { name1: 'Аружан', hosts: 'Құдалар: Бауыржан – Сәуле', invite_text: 'Сіздерді келініміз Аружанға арналған сырға салу тойымыздың қадірлі қонағы болуға шақырамыз!' },
  tilashar: { name1: 'Ерасыл', hosts: 'Ата-анасы: Дәулет – Айгүл', invite_text: 'Сіздерді ұлымыз Ерасылдың тілашар тойына арналған ақ дастарханымыздың қадірлі қонағы болуға шақырамыз!' },
  shildekhana: { name1: 'Інжу', hosts: 'Ата-анасы: Арман – Жанар', invite_text: 'Сіздерді қызымыз Інжудің дүниеге келуіне арналған шілдехана тойымызға шақырамыз!' },
};
// приглашение на свидание: свои время, город и место (дату выбирает гость)
SAMPLE.svidanie = { name1: 'Дана', hosts: 'Мерейбек', time: '21:00', city: 'Атырау', address: 'Bonasera, ул. Айтеке би, 75',
  invite_text: 'Приглашаю тебя на ужин. Хочу провести этот вечер с тобой — тёплая атмосфера, вкусная еда и долгие разговоры.' };
// мерей + сүндет: два имени (юбиляр и мальчики)
SAMPLE['merey-sundet'] = { name1: 'Ерлан (50 жас)', name2: 'Әлихан мен Нұрислам', hosts: 'Ерлан – Гүлнәр', city: 'Шымкент',
  invite_text: 'Сіздерді Ерланның 50 жас мерейтойы мен ұлдарымыз Әлихан мен Нұрисламның сүндет тойына арналған салтанатты ақ дастарханымыздың қадірлі қонағы болуға шақырамыз!' };
const TITLE = { 'merey-sundet': 'Қос қуанышқа шақыру', svidanie: 'Приглашение на свидание', tusaukeser: 'Тұсаукесер тойына шақыру', as_beru: 'Асқа шақыру', besik: 'Бесік тойына шақыру', sundet: 'Сүндет тойына шақыру',
  syrga_salu: 'Сырға салу тойына шақыру', tilashar: 'Тілашар тойына шақыру', shildekhana: 'Шілдеханаға шақыру' };

(async () => {
  const cards = await (await fetch(BASE + '/api/templates')).json();
  const browser = await puppeteer.launch({ headless: 'shell' });
  for (const id of ids) {
    const card = cards.find(t => String(t.id) === String(id));
    if (!card) { console.log(`#${id}: нет в каталоге (собран? каталог перечитан?)`); continue; }
    const fields = { template_id: id, date: '2027-06-12', time: '18:00', city: 'Алматы', address: '«Алтын Орда» мейрамханасы, Абай даңғылы 10',
      title: TITLE[card.category] || 'Тойға шақыру', ...(SAMPLE[card.category] || SAMPLE.tusaukeser) };
    const p = await browser.newPage();
    await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    const errors = []; p.on('pageerror', e => errors.push(e.message));
    await p.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    await Promise.all([p.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }), p.evaluate(f => {
      const fm = document.createElement('form'); fm.method = 'POST'; fm.action = '/preview';
      for (const [k, v] of Object.entries(f)) { const i = document.createElement('input'); i.name = k; i.value = v; fm.append(i); }
      document.body.append(fm); fm.submit();
    }, fields)]);
    await p.addStyleTag({ content: '.autoscroll,.fixedbar{display:none!important}' });
    await p.evaluate(() => document.fonts.ready);
    if (await p.$('.seal')) { await p.screenshot({ path: path.join(outDir, `${id}-env.png`) }); await p.click('.seal'); await new Promise(r => setTimeout(r, 2800)); }
    await p.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 220) { scrollTo(0, y); await new Promise(r => setTimeout(r, 150)); } });
    await new Promise(r => setTimeout(r, 2500));
    await p.evaluate(() => scrollTo(0, 0)); await new Promise(r => setTimeout(r, 300));
    await p.screenshot({ path: path.join(outDir, `${id}-full.png`), fullPage: true });
    await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await new Promise(r => setTimeout(r, 800));
    await p.screenshot({ path: path.join(outDir, `${id}-top.png`) });
    const bad = await p.evaluate(() => [...document.querySelectorAll('.c-text .txt, .c-text')].filter(e => e.scrollHeight > e.clientHeight + 2 || e.querySelector('.clampx')).map(e => e.textContent.slice(0, 30)));
    console.log(`#${id} ${card.category}: высота ${await p.evaluate(() => document.documentElement.scrollHeight)} px, ${bad.length ? 'НЕ ВЛЕЗЛО: ' + bad.join(' | ') : 'тексты влезли'}${errors.length ? ', ошибки страницы: ' + errors.join('; ') : ''}`);
    await p.close();
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
