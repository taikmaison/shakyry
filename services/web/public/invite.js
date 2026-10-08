// Рендер приглашения: данные шаблона (блоки → компоненты) → страница.
// Данные кладёт сервер в window.__INVITE__ = { mode, id, lang, title, names, date, time, envelope, blocks, api }.
(() => {
  const D = window.__INVITE__;
  const SHOT = D.mode === 'shot';          // снимок для каталога: без конверта и анимаций
  const PREVIEW = D.mode !== 'invite';     // в превью ответы гостей не сохраняются
  const LANG = { kz: 'kz', ru: 'ru', en: 'en', ky: 'ky', uz: 'uz' }[D.lang] || 'kz';

  // ---------------- тексты интерфейса ----------------
  const T = {
    kz: {
      kicker: 'Сізге шақыру', open: 'Шақыруды ашу үшін мөрді басыңыз',
      units: ['күн', 'сағат', 'минут', 'секунд'], started: 'Той басталды!', at: 'сағат', left: 'Қалған уақыт:',
      months: ['Қаңтар', 'Ақпан', 'Наурыз', 'Сәуір', 'Мамыр', 'Маусым', 'Шілде', 'Тамыз', 'Қыркүйек', 'Қазан', 'Қараша', 'Желтоқсан'],
      wd: ['Дс', 'Сс', 'Ср', 'Бс', 'Жм', 'Сб', 'Жс'], wdFull: ['Дүйсенбі', 'Сейсенбі', 'Сәрсенбі', 'Бейсенбі', 'Жұма', 'Сенбі', 'Жексенбі'],
      choose: 'Жауап нұсқасын таңдаңыз', nameNeeded: 'Атыңызды жазыңыз', thanks: 'Рахмет! Жауабыңыз қабылданды',
      answered: 'Сіз жауап бердіңіз', change: 'Жауапты өзгерту', demo: 'Бұл — үлгі. Жауаптар сақталмайды', fail: 'Жіберу мүмкін болмады, қайталап көріңіз',
      wishTitle: 'Тілек жазу', yourName: 'Атыңыз', yourWish: 'Тілегіңіз', send: 'Жіберу', wishThanks: 'Рахмет! Тілегіңіз қосылды',
      noWishes: 'Әзірше тілектер жоқ.\nБірінші болып тілек жазыңыз!', allWishes: 'Барлық тілектер', close: 'Жабу', required: 'Міндетті өріс',
      autoOn: 'Автоматты айналдыруды қосу', autoOff: 'Автоматты айналдыруды тоқтату',
    },
    ru: {
      kicker: 'Вам приглашение', open: 'Нажмите на печать, чтобы открыть',
      units: [['день', 'дня', 'дней'], ['час', 'часа', 'часов'], ['минута', 'минуты', 'минут'], ['секунда', 'секунды', 'секунд']], started: 'Праздник начался!', at: 'в', left: 'Осталось:',
      months: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'],
      wd: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'], wdFull: ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'],
      choose: 'Выберите вариант ответа', nameNeeded: 'Укажите ваше имя', thanks: 'Спасибо! Ваш ответ принят',
      answered: 'Вы уже ответили', change: 'Изменить ответ', demo: 'Это пример — ответы не сохраняются', fail: 'Не удалось отправить, попробуйте ещё раз',
      wishTitle: 'Написать пожелание', yourName: 'Ваше имя', yourWish: 'Ваше пожелание', send: 'Отправить', wishThanks: 'Спасибо! Пожелание добавлено',
      noWishes: 'Пока нет пожеланий.\nНапишите первым!', allWishes: 'Все пожелания', close: 'Закрыть', required: 'Обязательное поле',
      autoOn: 'Включить автопрокрутку', autoOff: 'Остановить автопрокрутку',
    },
    en: {
      kicker: "You're invited", open: 'Tap the seal to open',
      units: ['days', 'hours', 'minutes', 'seconds'], started: 'The celebration has begun!', at: 'at', left: 'Time left:',
      months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
      wd: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'], wdFull: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      choose: 'Choose an answer', nameNeeded: 'Please enter your name', thanks: 'Thank you! Your answer is saved',
      answered: 'You have answered', change: 'Change answer', demo: 'This is a sample — answers are not saved', fail: 'Could not send, try again',
      wishTitle: 'Write a wish', yourName: 'Your name', yourWish: 'Your wish', send: 'Send', wishThanks: 'Thank you! Your wish was added',
      noWishes: 'No wishes yet.\nBe the first!', allWishes: 'All wishes', close: 'Close', required: 'Required',
      autoOn: 'Start auto-scroll', autoOff: 'Stop auto-scroll',
    },
    ky: {
      kicker: 'Сизге чакыруу', open: 'Ачуу үчүн мөөрдү басыңыз',
      units: ['күн', 'саат', 'мүнөт', 'секунд'], started: 'Той башталды!', at: 'саат',
      months: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'],
      wd: ['Дш', 'Шш', 'Шр', 'Бш', 'Жм', 'Иш', 'Жк'], wdFull: ['Дүйшөмбү', 'Шейшемби', 'Шаршемби', 'Бейшемби', 'Жума', 'Ишемби', 'Жекшемби'],
    },
    uz: {
      kicker: 'Sizga taklifnoma', open: 'Ochish uchun muhrni bosing',
      units: ['kun', 'soat', 'daqiqa', 'soniya'], started: 'Bayram boshlandi!', at: 'soat',
      months: ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'],
      wd: ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'], wdFull: ['Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba', 'Yakshanba'],
    },
  };
  const langOf = l => ({ kz: 'kz', ru: 'ru', en: 'en', ky: 'ky', uz: 'uz' }[l] || LANG);
  const t = (key, l = LANG) => (T[langOf(l)] && T[langOf(l)][key]) ?? (T[LANG] && T[LANG][key]) ?? T.kz[key];

  // ---------------- утилиты ----------------
  function el(tag, attrs = {}, ...kids) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') e.className = v;
      else if (k === 'style') Object.assign(e.style, v);
      else if (k === 'text') e.textContent = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v);
    }
    for (const k of kids.flat()) if (k != null && k !== false) e.append(k);
    return e;
  }
  const px = v => (v == null || v === '' ? null : typeof v === 'number' ? v + 'px' : /^\d+(\.\d+)?$/.test(v) ? v + 'px' : v);
  const kebab = k => k.replace(/^Webkit/, '-webkit-').replace(/^webkit/, '-webkit-').replace(/[A-Z]/g, m => '-' + m.toLowerCase());
  const BOX_KEYS = new Set(['opacity', 'filter', 'maskImage', 'WebkitMaskImage', 'maskRepeat', 'WebkitMaskRepeat', 'maskSize', 'WebkitMaskSize', 'maskPosition', 'WebkitMaskPosition', 'mixBlendMode']);
  function applyStyle(node, style, pick) {
    for (const [k, v] of Object.entries(style || {})) {
      if (v == null || v === '' || v === 'None' || k === 'transform' || k === 'animation' || !pick(k)) continue;
      node.style.setProperty(kebab(k), typeof v === 'number' && !/opacity|zIndex|fontWeight|lineHeight|flex/.test(k) ? v + 'px' : String(v));
    }
  }
  const svg = (paths, vb = '0 0 24 24') => {
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', vb); s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor');
    s.setAttribute('stroke-width', '2'); s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round');
    s.innerHTML = paths; return s;
  };
  const ICON = {
    play: '<path d="M8 5.5v13l11-6.5z" fill="currentColor" stroke="none"/>',
    pause: '<rect x="6.5" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none"/><rect x="13.5" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none"/>',
    pen: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/>',
    camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
    pin: '<path d="M12 21s7-6.3 7-11.5A7 7 0 0 0 5 9.5C5 14.7 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    heart: '<path d="M12 20.5s-8-4.9-8-11A4.5 4.5 0 0 1 12 6.7a4.5 4.5 0 0 1 8 2.8c0 6.1-8 11-8 11z"/>',
    down: '<path d="M12 4v15M6 13l6 6 6-6"/>',
    ext: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  };
  function toast(msg) {
    const n = el('div', { class: 'toast', text: msg });
    document.body.append(n);
    setTimeout(() => n.remove(), 2600);
  }
  function modal(title, body, accent) {
    const bg = el('div', { class: 'modal-bg' });
    const box = el('div', { class: 'modal', style: accent ? { '--accent': accent } : {} }, el('h3', { text: title }), body,
      el('button', { class: 'x', type: 'button', text: t('close'), onclick: () => close() }));
    if (accent) box.style.setProperty('--accent', accent);
    const onKey = e => { if (e.key === 'Escape') close(); };
    const close = () => { bg.remove(); document.body.classList.remove('locked'); removeEventListener('keydown', onKey); };
    bg.addEventListener('click', e => { if (e.target === bg) close(); });
    addEventListener('keydown', onKey);
    bg.append(box); document.body.append(bg); document.body.classList.add('locked');
    return close;
  }
  async function post(url, body) {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) throw new Error(r.status);
    return r.json();
  }
  const store = {
    get: k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { } },
  };

  // время события: строка без часового пояса — в поясе шаблона (по умолчанию Алматы)
  function eventTime(s, tz) {
    if (!s) return null;
    if (/[zZ]|[+-]\d\d:\d\d$/.test(s)) return new Date(s).getTime();
    const [d, tm = '00:00'] = s.split('T');
    const [y, mo, da] = d.split('-').map(Number);
    const [h, mi] = tm.split(':').map(Number);
    const guess = Date.UTC(y, mo - 1, da, h, mi);
    try {
      const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz || 'Asia/Almaty', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
        .formatToParts(guess).filter(p => p.type !== 'literal').map(p => [p.type, Number(p.value)]));
      const asZone = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
      return guess - (asZone - guess);
    } catch { return guess - 5 * 3600e3; }
  }
  const dateParts = s => { const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/); return m ? { y: +m[1], m: +m[2], d: +m[3], hh: m[4] || null, mm: m[5] || null } : null; };
  const weekday = (y, m, d) => (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;   // 0 = понедельник
  const ruPlural = (n, forms) => forms[(n % 10 === 1 && n % 100 !== 11) ? 0 : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) ? 1 : 2];

  // ---------------- музыка ----------------
  const players = new Map();
  const audioButtons = [];
  function player(url) {
    if (!players.has(url)) { const a = new Audio(url); a.loop = true; a.preload = 'none'; players.set(url, a); a.addEventListener('play', syncAudio); a.addEventListener('pause', syncAudio); }
    return players.get(url);
  }
  function syncAudio() { for (const b of audioButtons) b.sync(); }
  function toggle(url) {
    const a = player(url);
    for (const [u, p] of players) if (u !== url) p.pause();
    if (a.paused) a.play().catch(() => {}); else a.pause();
  }
  const firstAudio = () => (D.blocks || []).flatMap(b => b.components || []).find(c => (c.type === 'audio-fixed' || c.type === 'audio') && c.data && c.data.audio_url);

  // ---------------- анимации ----------------
  const ENTRANCE = /^(slideIn|fadeIn|zoomIn|rotateIn|bounceIn)/;
  function animSpec(c) {
    const a = c.data && c.data.__animation;
    if (a && a.type && a.type !== 'none') return { name: a.type, dur: Number(a.duration) || 1, delay: Number(a.delay) || 0, inf: !!a.isInfinite, ease: null };
    const s = c.style && c.style.animation;
    if (!s || /^none/.test(s)) return null;
    const tok = s.split(/\s+/);
    const times = tok.filter(x => /^[\d.]+m?s$/.test(x)).map(x => x.endsWith('ms') ? parseFloat(x) / 1000 : parseFloat(x));
    return { name: tok[0], dur: times[0] || 1, delay: times[1] || 0, inf: /infinite/.test(s), ease: tok.find(x => /ease|linear|cubic|steps/.test(x)) || null };
  }
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    for (const e of entries) if (e.isIntersecting) { start(e.target); io.unobserve(e.target); }
  }, { rootMargin: '0px 0px -8% 0px' }) : null;
  function start(layer) {
    const s = layer._anim;
    layer.classList.remove('a-wait');
    const ease = s.ease || (s.name === 'spin' ? 'linear' : 'cubic-bezier(.22,.8,.3,1)');
    layer.style.animation = `${s.name} ${s.dur}s ${ease} ${s.delay}s ${s.inf ? 'infinite' : 1} both`;
  }
  function animate(layer, c) {
    const s = animSpec(c);
    if (!s || SHOT) return;
    layer._anim = s;
    if (ENTRANCE.test(s.name)) { layer.classList.add('a-wait'); pendingAnim.push(layer); }
    else if (s.inf) start(layer);
    else pendingAnim.push(layer);
  }
  const pendingAnim = [];
  function runAnimations() { for (const l of pendingAnim) io ? io.observe(l) : start(l); pendingAnim.length = 0; }

  // ---------------- компоненты ----------------
  const R = {};

  // у текста оригинал применяет только типографику: маска, обводка, рамка, фильтр и прозрачность из style игнорируются
  const TEXT_KEYS = new Set(['fontSize', 'fontFamily', 'color', 'textAlign', 'fontWeight', 'fontStyle', 'lineHeight', 'letterSpacing', 'textTransform', 'textShadow', 'textDecoration']);
  R.text = (c) => {
    const d = c.data || {}, st = c.style || {};
    const node = el('div', { class: wantFit(c) ? 'txt fit' : 'txt' });
    applyStyle(node, st, k => TEXT_KEYS.has(k));
    const ta = st.textAlign || 'center';
    node.style.justifyContent = ta === 'left' ? 'flex-start' : ta === 'right' ? 'flex-end' : 'center';
    const text = d.content ?? '';
    if (d.__textEffect === 'fade_letters' && !SHOT) {
      const speed = Number(d.__textEffectSpeed) || 0.7;
      const wrap = el('span');
      [...text].forEach((ch, i) => wrap.append(el('span', { class: 'ltr', text: ch, style: { animationDelay: (i * 0.06 / speed).toFixed(2) + 's' } })));
      node.append(wrap);
    } else node.textContent = text;
    return node;
  };
  // текст по кругу: поле 200×200 (вписывается в рамку), радиус и кегль — в единицах этого поля;
  // буквы равномерно распределены по всей окружности, каждая повёрнута по касательной
  R['circle-text'] = (c) => {
    const d = c.data || {}, st = c.style || {}, ci = d.circle || {};
    const r = Number(ci.radius) || 90, a0 = Number(ci.startAngle ?? -90);
    const dir = ci.direction === 'counterclockwise' ? -1 : 1;
    const chars = [' ', ...String(d.content || ''), ' '];
    const step = 360 / chars.length;
    const s = document.createElementNS(SVGNS, 'svg');
    s.setAttribute('viewBox', '0 0 200 200'); s.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    s.setAttribute('width', '100%'); s.setAttribute('height', '100%');
    const g = document.createElementNS(SVGNS, 'g');
    g.setAttribute('fill', st.color || '#333');
    Object.assign(g.style, { fontFamily: st.fontFamily || '', fontSize: px(st.fontSize) || '12px', fontWeight: st.fontWeight || '', whiteSpace: 'pre' });
    if (ci.letterSpacing != null) g.setAttribute('letter-spacing', ci.letterSpacing);
    chars.forEach((ch, i) => {
      const deg = i * step * dir, rad = (a0 + deg) * Math.PI / 180;
      const x = 100 + r * Math.cos(rad), y = 100 + r * Math.sin(rad);
      const tx = document.createElementNS(SVGNS, 'text');
      tx.setAttribute('x', x); tx.setAttribute('y', y); tx.setAttribute('transform', `rotate(${deg}, ${x}, ${y})`);
      tx.textContent = ch; g.append(tx);
    });
    s.append(g);
    return el('div', { class: 'ctext' }, s);
  };
  // текст по дуге: поле 300×100 (вписывается в рамку), дуга от 10 до 290, изгиб = intensity/2, кегль — в единицах поля
  R['curved-text'] = (c) => {
    const d = c.data || {}, st = c.style || {}, cu = d.curve || {};
    const k = Math.max(0, Math.min(100, Number(cu.intensity ?? 50))) / 2;
    const down = cu.direction === 'down';
    const y0 = down ? 25 : 75, y1 = down ? y0 + k : y0 - k;
    const id = 'cv' + Math.random().toString(36).slice(2, 8);
    const s = document.createElementNS(SVGNS, 'svg');
    s.setAttribute('viewBox', '0 0 300 100'); s.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    s.setAttribute('width', '100%'); s.setAttribute('height', '100%');
    s.innerHTML = `<defs><path id="${id}" d="M 10 ${y0} Q 150 ${y1} 290 ${y0}" fill="none"/></defs>`;
    const tx = document.createElementNS(SVGNS, 'text');
    tx.setAttribute('fill', st.color || '#333'); tx.setAttribute('text-anchor', 'middle');
    Object.assign(tx.style, { fontFamily: st.fontFamily || '', fontSize: px(st.fontSize) || '30px', fontWeight: st.fontWeight || '', whiteSpace: 'pre' });
    const tp = document.createElementNS(SVGNS, 'textPath');
    tp.setAttribute('href', '#' + id); tp.setAttribute('startOffset', '50%'); tp.textContent = d.content || '';
    tx.append(tp); s.append(tx);
    return el('div', { class: 'ctext' }, s);
  };

  // рваный край картинки (своя генерация). Край — «случайное блуждание» с мелким шагом (~3 px): небольшие колебания, изредка рывок,
  // всё в полосе высотой edge.height от края. Детерминировано по seed/variant.
  function tornClip(edge, w, h) {
    let a = ((Number(edge.seed) || 1) * 2654435761 + String(edge.variant || '').split('').reduce((s, ch) => s * 31 + ch.charCodeAt(0), 7)) >>> 0;
    const rnd = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const H = Math.min(Number(edge.height) || 30, h * 0.6);
    const n = Math.max(16, Math.round(w / 3.2));
    const walk = () => {
      const lo = H * 0.05, hi = H * 0.85, mid = (lo + hi) / 2, out = [];
      let y = lo + rnd() * (hi - lo);
      for (let i = 0; i <= n; i++) {
        out.push(y);
        let dy = (rnd() - 0.5) * 9;
        if (rnd() < 0.08) dy *= 2;
        dy += (mid - y) * 0.06;
        y = Math.max(0, Math.min(H, y + dy));
      }
      return out;
    };
    const pc = (x, y) => `${(x / w * 100).toFixed(2)}% ${(y / h * 100).toFixed(2)}%`;
    const pts = [];
    if (edge.top) walk().forEach((y, i) => pts.push(pc(i / n * w, y))); else pts.push(pc(0, 0), pc(w, 0));
    if (edge.bottom) walk().forEach((y, i) => pts.push(pc(w - i / n * w, h - y))); else pts.push(pc(w, h), pc(0, h));
    return `polygon(${pts.join(',')})`;
  }
  // картинка: обёртка (не меньше 50×50, маска, скругление) → img (вписывание, прозрачность, фильтр, тень).
  // Фон и рамку из style оригинал у картинок не рисует.
  const IMG_BOX_KEYS = new Set(['borderRadius', 'maskImage', 'WebkitMaskImage', 'maskSize', 'WebkitMaskSize', 'maskRepeat', 'WebkitMaskRepeat', 'maskPosition', 'WebkitMaskPosition']);
  const IMG_KEYS = new Set(['opacity', 'filter', 'boxShadow', 'mixBlendMode']);
  R.image = (c) => {
    const d = c.data || {}, st = c.style || {};
    const box = el('div', { class: 'img' });
    applyStyle(box, st, k => IMG_BOX_KEYS.has(k));
    const img = el('img', { src: d.src || '', alt: '', loading: 'lazy', decoding: 'async', draggable: 'false' });
    applyStyle(img, st, k => IMG_KEYS.has(k));
    img.style.objectFit = st.objectFit || 'cover';
    img.onerror = () => { img.style.visibility = 'hidden'; };
    box.append(img);
    if (d.tornEdge && (d.tornEdge.top || d.tornEdge.bottom)) box.style.clipPath = tornClip(d.tornEdge, Number(c.size.width) || 300, Number(c.size.height) || 300);
    return box;
  };
  R.gif = (c) => {
    const d = c.data || {};
    const box = el('div', { class: 'img' }, el('img', { src: d.src || '', alt: '', loading: 'lazy' }));
    box.firstChild.style.objectFit = d.objectFit || 'contain';
    return box;
  };
  R.video = (c) => {
    const d = c.data || {}, st = c.style || {};
    const box = el('div', { class: 'img' });
    applyStyle(box, st, k => !BOX_KEYS.has(k));
    const v = el('video', { src: d.src || '', muted: '', autoplay: '', playsinline: '', preload: 'metadata' });
    v.muted = true; v.loop = d.loop !== false; v.style.objectFit = d.objectFit || 'cover';
    box.append(v);
    return box;
  };
  // фигура: все свойства (фон, рамка, скругление, тень, фильтр, маска, прозрачность) — на самой фигуре, минимум 20×20
  R.shape = (c) => {
    const d = c.data || {}, st = c.style || {};
    const node = el('div', { class: 'shp' });
    applyStyle(node, st, () => true);
    if (d.shapeType === 'circle') node.style.borderRadius = '50%';
    // линия: только верхняя граница цветом рамки, без заливки (как в оригинале)
    if (d.shapeType === 'line') {
      const bs = isSet(st.borderStyle) ? st.borderStyle : 'solid';
      Object.assign(node.style, { background: 'none', border: 'none', borderTop: `${px(st.borderWidth) || '1px'} ${bs} ${st.borderColor || '#000'}`, borderRadius: '0' });
    }
    const cut = d.cutout;
    const hasMask = st.maskImage && st.maskImage !== 'none' || st.WebkitMaskImage && st.WebkitMaskImage !== 'none';
    if (cut && cut.enabled && !hasMask) {
      const r = Number(cut.size) || 20, f = Number(cut.feather) || 0;
      const g = `radial-gradient(circle at ${cut.x ?? 50}% ${cut.y ?? 50}%, transparent ${r}%, #000 ${r + f + 0.5}%)`;
      node.style.maskImage = g; node.style.webkitMaskImage = g;
    }
    return node;
  };
  R.lottie = (c) => {
    const d = c.data || {}, st = c.style || {};
    const box = el('div');
    applyStyle(box, st, k => !BOX_KEYS.has(k));
    if (window.lottie && d.animationData) {
      const anim = window.lottie.loadAnimation({ container: box, renderer: 'svg', loop: d.loop !== false, autoplay: !SHOT && d.autoplay !== false, animationData: d.animationData });
      if (d.speed) anim.setSpeed(Number(d.speed));
      if (SHOT) anim.goToAndStop(Math.floor((anim.totalFrames || 1) / 2), true);
    }
    return box;
  };

  R.button = (c) => {
    const d = c.data || {};
    const a = el('a', { class: 'btn', href: d.url || '#', target: d.openInNewTab === false ? null : '_blank', rel: 'noopener' });
    const bg = d.bgType === 'gradient' && d.gradientColor
      ? `linear-gradient(${Number(d.gradientAngle) || 135}deg, ${d.backgroundColor || '#333'}, ${d.gradientColor})` : (d.backgroundColor || '#333');
    Object.assign(a.style, {
      background: bg, color: d.textColor || '#fff', borderRadius: px(d.borderRadius ?? 12),
      border: `${px(d.borderWidth || 0)} ${d.borderStyle || 'solid'} ${d.borderColor || 'transparent'}`,
      fontSize: px(d.fontSize || 16), fontFamily: d.fontFamily || '', fontWeight: d.fontWeight || 600,
      letterSpacing: d.letterSpacing != null ? px(d.letterSpacing) : '', textTransform: d.textTransform || '',
    });
    if (Number(d.ringWidth)) { a.style.outline = `${px(d.ringWidth)} solid ${d.ringColor || d.borderColor || '#ccc'}`; a.style.outlineOffset = px(d.ringGap || 3); }
    // тень: у старых кнопок (без shadowStyle) оригинал рисует мягкую цветную тень
    const sh = d.shadowStyle || 'soft';
    if (sh !== 'none') a.style.boxShadow = `0 ${sh === 'strong' ? '16px 32px' : '12px 24px'} ${alpha(d.shadowColor || d.backgroundColor || '#333', sh === 'strong' ? .5 : .35)}`;
    if (d.hoverEffect && d.hoverEffect !== 'none') a.classList.add('lift');
    if (d.idleEffect === 'shine') a.classList.add('shine');
    // иконка: заданная — «метка»; у старых кнопок со ссылкой в новой вкладке — значок внешней ссылки справа
    const legacyExt = d.icon == null && d.openInNewTab !== false && d.url && d.url !== '#';
    const icon = d.icon && d.icon !== 'none' ? svg(ICON.pin) : legacyExt ? svg(ICON.ext) : null;
    if (legacyExt && icon) icon.classList.add('ext');
    if (icon && d.iconPosition === 'left') a.append(icon);
    a.append(el('span', { text: d.text || '' }));
    if (icon && d.iconPosition !== 'left') a.append(icon);
    if (!d.url || d.url === '#') a.addEventListener('click', e => e.preventDefault());
    return a;
  };

  R.timer = (c) => {
    const d = c.data || {}, st = c.style || {};
    const lang = d.timerLanguage || LANG;
    const node = el('div', { class: 'timer' });
    applyStyle(node, st, k => !BOX_KEYS.has(k));
    if (d.backgroundColor) node.style.background = d.backgroundColor;
    if (d.borderRadius != null) node.style.borderRadius = px(d.borderRadius);
    const target = eventTime(d.event_date, d.timezone);
    const title = el('div', { text: d.event_title || t('left', lang) || '', style: { fontSize: px(d.titleFontSize || 16), fontFamily: d.titleFontFamily || '', color: d.titleColor || '' } });
    const units = el('div', { class: 'units', style: { gap: px(d.spacing ?? 12) } });
    const show = [d.show_days !== false, d.show_hours !== false, d.show_minutes !== false, d.show_seconds !== false];
    const cells = [0, 1, 2, 3].filter(i => show[i]).map(i => {
      const n = el('div', { class: 'n', style: { fontSize: px(d.numbersFontSize || 24), fontFamily: d.numbersFontFamily || '', color: d.numbersColor || '' } });
      const l = el('div', { class: 'l', style: { fontSize: px(d.labelsFontSize || 11), fontFamily: d.labelsFontFamily || '', color: d.labelsColor || '' } });
      if (d.showLabels === false) l.style.display = 'none';
      units.append(el('div', { class: 'u' }, n, l));
      return { i, n, l };
    });
    node.append(title, units);
    const tick = () => {
      let left = Math.max(0, (target || 0) - Date.now());
      if (!target || left <= 0) { title.textContent = t('started', lang); title.classList.add('end'); units.style.display = 'none'; return false; }
      const v = [Math.floor(left / 864e5), Math.floor(left / 36e5) % 24, Math.floor(left / 6e4) % 60, Math.floor(left / 1e3) % 60];
      for (const cl of cells) {
        cl.n.textContent = String(v[cl.i]).padStart(2, '0');
        const u = t('units', lang)[cl.i];
        cl.l.textContent = Array.isArray(u) ? ruPlural(v[cl.i], u) : u;
      }
      return true;
    };
    if (tick() && !SHOT) { const id = setInterval(() => { if (!tick()) clearInterval(id); }, 1000); }
    return node;
  };

  // время события для календарей: в сыром шаблоне — его собственное; в приглашении — только если пользователь указал время
  function eventClock(own, p) {
    if (!RAW && !D.time) return '';
    return own || (p && p.hh ? `${p.hh}:${p.mm}` : '') || D.time || '';
  }
  R['calendar-pro'] = (c) => {
    const d = c.data || {}, st = c.style || {};
    const lang = d.calendarLanguage || LANG;
    const p = dateParts(d.event_date) || dateParts(D.date) || {};
    const node = el('div', { class: 'calpro' });
    applyStyle(node, st, k => !BOX_KEYS.has(k));
    Object.assign(node.style, { color: d.mainColor || '#6e563f', fontFamily: d.fontFamily ? `"${d.fontFamily}", serif` : '', fontSize: Math.max(12, (Number(c.size.width) || 360) / 22) + 'px' });
    if (!p.y) return node;
    const time = eventClock(d.event_time, p);
    node.append(
      el('div', { class: 'wd', text: t('wdFull', lang)[weekday(p.y, p.m, p.d)] }),
      el('div', { class: 'row' }, el('div', { class: 'side', text: t('months', lang)[p.m - 1] }), el('div', { class: 'day', text: String(p.d) }), el('div', { class: 'side', text: String(p.y) })),
    );
    if (time) node.append(el('div', { class: 'tm', text: `${t('at', lang)} ${time}` }));
    return node;
  };

  // цвет с прозрачностью: #rgb / #rrggbb / rgb() → rgba()
  function alpha(color, a) {
    const s = String(color || '').trim();
    let m = s.match(/^#([0-9a-f]{3,8})$/i);
    if (m) {
      let h = m[1]; if (h.length <= 4) h = [...h].map(x => x + x).join('');
      return `rgba(${parseInt(h.slice(0, 2), 16)}, ${parseInt(h.slice(2, 4), 16)}, ${parseInt(h.slice(4, 6), 16)}, ${a})`;
    }
    m = s.match(/^rgba?\(([^)]+)\)$/i);
    if (m) { const [r, g, b] = m[1].split(/[ ,/]+/); return `rgba(${r}, ${g}, ${b}, ${a})`; }
    return s || `rgba(0, 0, 0, ${a})`;
  }
  const fam = f => f ? `"${String(f).replace(/"/g, '')}", Georgia, serif` : '';
  const MONTHS_GEN = { ru: ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'] };
  const START = { kz: 'Басталуы', ru: 'Начало', en: 'Start', ky: 'Башталышы', uz: 'Boshlanishi' };

  // маркер дня события — свой рисунок «от руки»: основной контур + пара тонких штрихов-повторов
  const MARK = {
    heart: [
      ['M50 87 C30 74 8 58 8 35 C8 20 19 10 32 11 C41 12 47 19 50 27 C53 19 59 12 68 11 C81 10 92 20 92 35 C92 58 70 74 50 87 Z', 3, 1],
      ['M46 82 C27 69 12 54 12 36 C12 24 21 15 31 15 C39 15 45 21 48 28', 2, .65],
      ['M53 25 C56 18 62 14 69 14 C80 14 88 23 88 34 C88 41 86 46 83 50', 2, .6],
      ['M47 78 C35 70 22 58 18 44', 1.3, .4],
      ['M57 76 C65 70 74 62 80 53', 1.3, .4],
    ],
    circle: [
      ['M50 8 C73 7 92 25 92 50 C92 74 73 92 49 92 C26 92 8 73 8 50 C8 26 27 9 50 8 Z', 2.5, 1],
      ['M52 12 C71 13 86 29 87 49', 1.5, .55],
      ['M47 88 C31 86 17 74 14 58', 1.3, .45],
    ],
  };
  function marker(type, size, color) {
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', '0 0 100 100'); s.setAttribute('width', size); s.setAttribute('height', size);
    s.innerHTML = (MARK[type] || MARK.circle).map(([d, w, o]) => `<path d="${d}" pathLength="1" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" opacity="${o}"/>`).join('');
    return el('div', { class: 'mk' + (SHOT ? '' : ' draw') }, s);
  }

  // календарь месяца: раскладка по замерам оригинала (классический и вариант «elegant»)
  R.calendar = (c) => {
    const d = c.data || {}, st = c.style || {};
    const lang = langOf(d.calendarLanguage || LANG);
    const ev = (d.event_dates && d.event_dates[0]) || {};
    const p = dateParts(ev.date) || dateParts(d.event_date) || dateParts(D.date);
    const elegant = d.variant === 'elegant';
    const T0 = Number(d.titleFontSize) || 16;
    const titleC = d.titleColor || '#333333', daysC = d.daysColor || '#333333', wdC = d.weekdaysColor || '#666666', mkC = d.eventMarkerColor || titleC;
    const node = el('div', { class: 'cal' + (elegant ? ' eleg' : '') });
    applyStyle(node, st, k => !BOX_KEYS.has(k));
    Object.assign(node.style, { background: d.backgroundColor || 'transparent', borderRadius: px(d.borderRadius ?? 8), padding: px(d.padding ?? 20), fontFamily: fam(d.daysFontFamily || d.titleFontFamily) });
    if (!p) return node;
    const time = eventClock(ev.time || d.event_time, p);
    const tFont = fam(d.titleFontFamily), label = ev.title || START[lang] || START.kz;
    const orn = (w, cls) => el('div', { class: 'orn ' + cls }, el('div', {},
      el('span', { style: { width: w, background: `linear-gradient(90deg, transparent, ${alpha(titleC, .55)})` } }),
      (() => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 10 10'); s.setAttribute('width', 9); s.setAttribute('height', 9);
        s.innerHTML = `<path d="M5 0 L10 5 L5 10 L0 5 Z" fill="none" stroke="${titleC}" stroke-width="1" opacity=".8"/>`; return s; })(),
      el('span', { style: { width: w, background: `linear-gradient(270deg, transparent, ${alpha(titleC, .55)})` } })));

    if (d.titleText) node.append(el('div', { class: 'ttl', text: d.titleText, style: { fontSize: px(T0), color: titleC, fontFamily: tFont } }));
    if (elegant) {
      node.append(el('div', { class: 'hd', style: { fontFamily: tFont } },
        el('div', { class: 'yr', text: String(p.y), style: { color: alpha(titleC, .65) } }),
        el('div', { class: 'mo', text: t('months', lang)[p.m - 1], style: { fontSize: px(T0 * 1.875), color: titleC } })));
      if (d.showOrnament !== false) node.append(orn('32%', 'top'));
    } else {
      node.append(el('div', { class: 'hd', style: { fontFamily: tFont, color: titleC, fontSize: px(T0 + 8) } },
        el('span', { text: t('months', lang)[p.m - 1] }), el('span', { text: String(p.y) })));
    }
    const wds = el('div', { class: 'wds', style: elegant ? { borderBottomColor: alpha(titleC, .18) } : {} });
    for (const w of t('wd', lang)) wds.append(el('div', { text: w, style: { fontSize: px(d.weekdaysFontSize || 12), fontFamily: fam(d.weekdaysFontFamily), color: elegant ? alpha(wdC, .78) : wdC } }));
    node.append(wds);
    const grid = el('div', { class: 'days' });
    const first = weekday(p.y, p.m, 1), days = new Date(p.y, p.m, 0).getDate();
    for (let i = 0; i < first; i++) grid.append(el('div'));
    const mSize = Number(d.eventMarkerSize) || 40;
    const heart = d.eventMarkerType === 'heart';
    for (let day = 1; day <= days; day++) {
      const wd = (first + day - 1) % 7;
      const color = wd >= 5 && elegant ? (d.weekendColor || alpha(daysC, .62)) : daysC;
      const cell = el('div', { style: { fontSize: px(d.daysFontSize || 14), fontFamily: fam(d.daysFontFamily), color } }, el('span', { text: String(day) }));
      if (day === p.d) {
        cell.classList.add('ev');
        cell.prepend(marker(heart ? 'heart' : 'circle', mSize * (elegant ? 1.15 : heart ? 1.55 : 1.25), mkC));
      }
      grid.append(cell);
    }
    node.append(grid);
    if (elegant) {
      if (d.showOrnament !== false) node.append(orn('70px', 'bottom'));
      const wdShort = t('wd', lang)[weekday(p.y, p.m, p.d)];
      const mon = (MONTHS_GEN[lang] || t('months', lang).map(x => x.toLowerCase()))[p.m - 1];
      node.append(el('div', { class: 'card', style: { borderColor: alpha(titleC, .28), background: `linear-gradient(135deg, ${alpha(titleC, .1)}, ${alpha(titleC, .03)})`, color: titleC } },
        el('div', { class: 'l' }, el('div', { class: 'dt', text: `${p.d} ${mon} · ${wdShort}` }), el('div', { class: 'lb', text: label, style: { fontSize: px(T0 + 2), fontFamily: tFont } })),
        el('div', { class: 'sep', style: { background: `linear-gradient(transparent, ${alpha(titleC, .55)}, transparent)` } }),
        el('div', { class: 'tm', text: time, style: { fontFamily: tFont, fontSize: px(T0 + 10) } })));
    } else if (time) {
      node.append(el('div', { class: 'card', style: { background: alpha(mkC, .08) } },
        el('div', { class: 'lb', text: label, style: { fontSize: px(T0 + 2), color: titleC } }),
        el('div', { class: 'tm', text: time, style: { fontSize: px(T0 + 6), color: mkC } })));
    }
    return node;
  };

  // ---------------- анкеты ----------------
  function answeredKey(id) { return `rsvp:${D.id || D.template_id}:${id}`; }
  // случайный id устройства гостя (один на приглашение): повторный ответ заменяет прежний на сервере
  function guestKey() {
    const k = `guest:${D.id || D.template_id}`;
    let v = store.get(k);
    if (typeof v !== 'string' || !/^[\w-]{8,64}$/.test(v)) {
      try { v = crypto.randomUUID(); }
      catch { const a = new Uint8Array(16); try { crypto.getRandomValues(a); } catch { a.forEach((_, i) => { a[i] = Math.random() * 256; }); } v = [...a].map(x => x.toString(16).padStart(2, '0')).join(''); }
      store.set(k, v);
    }
    return v;
  }
  // 'ok' — отправлено, 'demo' — превью (только подсказка, ничего не сохраняем), null — ошибка
  async function sendAnswer(formId, payload, lang) {
    if (PREVIEW) { toast(t('demo', lang)); return 'demo'; }
    try { await post(D.api.rsvp, { form_id: formId, ...payload, guest_key: guestKey() }); return 'ok'; }
    catch { toast(t('fail', lang)); return null; }
  }
  function answeredNow(formId, lang, rebuild) { store.set(answeredKey(formId), true); toast(t('thanks', lang)); rebuild(); }
  function doneView(node, formId, lang, rebuild) {
    node.replaceChildren(el('div', { class: 'done' }, el('div', { text: t('answered', lang) }),
      el('button', { class: 'again', type: 'button', text: t('change', lang), onclick: () => { store.set(answeredKey(formId), null); rebuild(); } })));
  }
  function optionList(d, options, onPick) {
    let picked = null;
    const oc = d.option_color || d.mainColor || '#7a6040';
    const items = options.map(o => {
      const b = el('button', { class: 'opt', type: 'button' }, el('span', { class: 'dot' }), el('span', { text: o.text }));
      Object.assign(b.style, {
        minHeight: px(d.option_height || 56), borderRadius: px(d.option_borderRadius ?? 12), fontSize: px(d.option_fontSize || 15),
        fontFamily: d.option_fontFamily || d.button_fontFamily || '', color: oc,
        borderColor: alpha(oc, .4), background: d.option_backgroundColor || alpha(oc, .07),
      });
      // выбранный вариант — полная рамка и чуть плотнее заливка (на любом фоне читается)
      b.addEventListener('click', () => {
        picked = o;
        items.forEach(x => { const on = x === b; x.classList.toggle('on', on); x.style.borderColor = on ? oc : alpha(oc, .4); if (!d.option_backgroundColor) x.style.background = alpha(oc, on ? .16 : .07); });
        onPick && onPick(o);
      });
      return b;
    });
    return { items, get: () => picked };
  }
  function submitButton(d, text) {
    return el('button', {
      class: 'submit', type: 'button', text, style: {
        minHeight: px(d.submit_button_height || 56), borderRadius: px(d.submit_button_borderRadius ?? 12), background: d.submit_button_backgroundColor || d.mainColor || '#7a6040',
        color: d.submit_button_textColor || '#fff', fontSize: px(d.submit_button_fontSize || 16), fontFamily: d.submit_button_fontFamily || '', letterSpacing: '.04em',
      },
    });
  }
  function inputStyle(d) {
    return { height: px(d.field_height || 48), borderRadius: px(d.field_borderRadius ?? 12), border: `${px(d.field_borderWidth ?? 2)} solid ${d.field_borderColor || d.mainColor || '#ccc'}`,
      background: d.field_backgroundColor || '#fff', color: d.field_color || '#333', fontSize: px(Math.max(16, d.field_fontSize || 16)), fontFamily: d.field_fontFamily || '' };
  }

  // form2: варианты ответа → окно с именем
  R.form2 = (c) => {
    const d = c.data || {}, st = c.style || {};
    const lang = d.formLang || d.lang || LANG;
    const node = el('div', { class: 'form f2' });
    if (st.backgroundColor) node.style.background = st.backgroundColor;
    const build = () => {
      node.replaceChildren();
      if (store.get(answeredKey(d.form_id))) return doneView(node, d.form_id, lang, build);
      const opts = optionList(d, (d.form_buttons || []).map(b => ({ text: b.button_text, value: b.button_value })));
      const btn = submitButton(d, d.submit_button_text || t('send', lang));
      btn.addEventListener('click', () => {
        const o = opts.get();
        if (!o) return toast(t('choose', lang));
        const field = (d.form_fields || [])[0] || {};
        const input = el('input', { type: 'text', placeholder: field.placeholder || t('yourName', lang), autocomplete: 'name' });
        const go = el('button', { class: 'go', type: 'button', text: d.modal_button_text || t('send', lang) });
        const close = modal(d.modal_title || field.field_label || t('yourName', lang), el('div', {}, input, go), d.mainColor);
        setTimeout(() => input.focus(), 50);
        go.addEventListener('click', async () => {
          const name = input.value.trim();
          if (!name) return input.focus();
          go.disabled = true;
          const r = await sendAnswer(d.form_id, { action: o.value, action_text: o.text, fields: { [field.field_label || 'name']: name } }, lang);
          if (r) close(); else go.disabled = false;
          if (r === 'ok') answeredNow(d.form_id, lang, build);
        });
      });
      node.append(...opts.items, btn);
    };
    build();
    return node;
  };

  // form: поля + варианты ответа + кнопка
  R.form = (c) => {
    const d = c.data || {}, st = c.style || {};
    const lang = d.formLang || d.lang || LANG;
    const node = el('div', { class: 'form' });
    applyStyle(node, st, k => !BOX_KEYS.has(k));
    Object.assign(node.style, { background: d.form_backgroundColor || st.backgroundColor || 'transparent', borderRadius: px(d.form_borderRadius ?? 8), padding: px(d.form_padding ?? 12) });
    const build = () => {
      node.replaceChildren();
      if (store.get(answeredKey(d.form_id))) return doneView(node, d.form_id, lang, build);
      if (d.form_title) node.append(el('div', { class: 'title', text: d.form_title, style: { fontSize: px(d.title_fontSize || 22), fontFamily: d.title_fontFamily || '', color: d.title_color || '' } }));
      if (d.form_description) node.append(el('div', { class: 'title', text: d.form_description, style: { fontSize: px(d.description_fontSize || 14), fontFamily: d.description_fontFamily || '', color: d.description_color || '' } }));
      const inputs = (d.form_fields || []).map(f => {
        const input = el('input', { type: 'text', placeholder: f.placeholder || '' });
        Object.assign(input.style, inputStyle(d));
        node.append(el('label', { text: f.field_label || '', style: { fontSize: px(d.label_fontSize || 14), fontFamily: d.label_fontFamily || '', color: d.label_color || '' } }), input);
        return { f, input };
      });
      const opts = optionList({ ...d, option_color: d.option_color || d.button_color }, (d.form_buttons || []).map(b => ({ text: b.button_text, value: b.button_value })));
      node.append(...opts.items);
      const btn = submitButton(d, d.submit_button_text || t('send', lang));
      btn.addEventListener('click', async () => {
        const miss = inputs.find(x => x.f.is_required && !x.input.value.trim());
        if (miss) { miss.input.focus(); return toast(t('nameNeeded', lang)); }
        const o = opts.get();
        if ((d.form_buttons || []).length && !o) return toast(t('choose', lang));
        btn.disabled = true;
        const fields = Object.fromEntries(inputs.map(x => [x.f.field_label || x.f.field_name, x.input.value.trim()]));
        const r = await sendAnswer(d.form_id, { action: o && o.value, action_text: o && o.text, fields }, lang);
        btn.disabled = false;
        if (r === 'ok') answeredNow(d.form_id, lang, build);
      });
      node.append(btn);
    };
    build();
    return node;
  };

  // form3: список вопросов (текст / выбор)
  R.form3 = (c) => {
    const d = c.data || {};
    const lang = d.formLang || d.lang || LANG;
    const node = el('div', { class: 'form' });
    Object.assign(node.style, { background: d.form_backgroundColor || 'transparent', borderRadius: px(d.form_borderRadius ?? 16), padding: px(d.form_padding ?? 16) });
    const build = () => {
      node.replaceChildren();
      if (store.get(answeredKey(d.form_id))) return doneView(node, d.form_id, lang, build);
      const qs = (d.questions || []).map(q => {
        const box = el('div', { class: 'q' }, el('label', { text: q.label || '', style: { fontSize: px(d.label_fontSize || 14), fontFamily: d.label_fontFamily || '', color: d.label_color || d.mainColor || '' } }));
        let get;
        if (q.type === 'choice') {
          const o = optionList(d, (q.options || []).map(x => ({ text: x.text, value: x.value })));
          box.append(...o.items); get = () => o.get() && o.get().value;
        } else {
          const input = el(Number(q.lines) > 1 ? 'textarea' : 'input', { type: 'text', placeholder: q.placeholder || '' });
          Object.assign(input.style, inputStyle(d));
          box.append(input); get = () => input.value.trim();
        }
        node.append(box);
        return { q, get };
      });
      const btn = submitButton(d, d.submit_button_text || t('send', lang));
      btn.addEventListener('click', async () => {
        const miss = qs.find(x => x.q.is_required && !x.get());
        if (miss) return toast(`${miss.q.label || ''} — ${t('required', lang)}`);
        btn.disabled = true;
        const fields = Object.fromEntries(qs.map(x => [x.q.label || x.q.field_name, x.get() || '']));
        const r = await sendAnswer(d.form_id, { fields }, lang);
        btn.disabled = false;
        if (r === 'ok') answeredNow(d.form_id, lang, build);
      });
      node.append(btn);
    };
    build();
    return node;
  };

  // ---------------- пожелания ----------------
  // в превью и снимке каталога — пара примерных пожеланий, чтобы блок не был пустым (как на демо оригинала)
  const SAMPLE_WISHES = {
    kz: [{ name: 'Айгерім', message: 'Жастарға бақыт, береке және шексіз махаббат тілеймін! Шаңырақтарыңыз биік болсын!' }, { name: 'Ерлан', message: 'Құтты болсын! Қуаныштарыңыз көп болсын.' }],
    ru: [{ name: 'Айгерим', message: 'Желаем счастья, любви и благополучия! Пусть ваш дом будет полной чашей!' }, { name: 'Ерлан', message: 'Поздравляем! Пусть радость всегда будет с вами.' }],
  };
  let wishes = PREVIEW ? (SAMPLE_WISHES[LANG] || SAMPLE_WISHES.kz).map(w => ({ ...w, created_at: Date.now() })) : [];
  const wishLists = [];
  async function loadWishes() {
    if (PREVIEW || !D.api) return;
    try { wishes = await (await fetch(D.api.wishes)).json(); } catch { wishes = []; }
    for (const w of wishLists) w.render();
  }
  const AV = ['#c08457', '#8f6bb3', '#5f9b8c', '#c2677b', '#6a86c4', '#b39a4f'];
  function wishCard(w, bg, accent, font) {
    const name = w.name || '—';
    const card = el('div', { class: 'wcard', style: { background: bg || '#fff', fontFamily: font || '' } },
      el('div', { class: 'q', text: '“', style: { color: accent } }),
      el('div', { class: 'msg', text: w.message || '' }),
      el('div', { class: 'who' },
        el('div', { class: 'av', text: name.trim().slice(0, 2).toUpperCase(), style: { background: AV[name.length % AV.length] } }),
        el('div', {}, el('div', { class: 'nm', text: name, style: { color: accent } }), el('div', { class: 'dt', text: new Date(w.created_at).toLocaleDateString() }))));
    return card;
  }
  function openWishForm(lang, accent) {
    const name = el('input', { type: 'text', autocomplete: 'name' });
    const msg = el('textarea');
    const go = el('button', { class: 'go', type: 'button', text: t('send', lang) });
    const close = modal(t('wishTitle', lang), el('div', {}, el('label', { text: t('yourName', lang) }), name, el('label', { text: t('yourWish', lang) }), msg, go), accent);
    setTimeout(() => name.focus(), 50);
    go.addEventListener('click', async () => {
      if (!name.value.trim()) return name.focus();
      if (!msg.value.trim()) return msg.focus();
      if (PREVIEW) { close(); return toast(t('demo', lang)); }
      go.disabled = true;
      try { await post(D.api.wishes, { name: name.value.trim(), message: msg.value.trim() }); close(); toast(t('wishThanks', lang)); loadWishes(); }
      catch { toast(t('fail', lang)); go.disabled = false; }
    });
  }
  R['wishes-list'] = (c) => {
    const d = c.data || {};
    const lang = d.form_lang || LANG;
    const accent = d.title_color || d.button_color || '#7a6040';
    const node = el('div', { class: 'wishes', style: { color: accent, fontFamily: d.font_family || '' } });
    let timer = null;
    const render = () => {
      node.replaceChildren();
      clearInterval(timer);
      if (!wishes.length) { node.append(el('div', { class: 'empty', text: t('noWishes', lang), style: { background: d.card_bg_color || '#fff' } })); return; }
      const track = el('div', { class: 'track' });
      const list = wishes.slice(0, 12);
      list.forEach(w => track.append(wishCard(w, d.card_bg_color, accent, d.font_family)));
      const dots = el('div', { class: 'dots' }, list.map((_, i) => el('i', { class: i ? '' : 'on' })));
      track.addEventListener('scroll', () => {
        const i = Math.round(track.scrollLeft / track.clientWidth);
        [...dots.children].forEach((x, j) => x.classList.toggle('on', i === j));
      }, { passive: true });
      const all = el('button', { class: 'all', type: 'button', text: d.button_text || t('allWishes', lang), style: { color: d.button_color || accent } });
      all.addEventListener('click', () => modal(t('allWishes', lang), el('div', { class: 'list' }, wishes.map(w => wishCard(w, '#fff', accent))), accent));
      node.append(track, dots, all);
      if (list.length > 1 && !SHOT) timer = setInterval(() => {
        const i = Math.round(track.scrollLeft / track.clientWidth);
        track.scrollTo({ left: ((i + 1) % list.length) * track.clientWidth, behavior: 'smooth' });
      }, Number(d.auto_scroll_interval) || 3500);
    };
    wishLists.push({ render });
    render();
    return node;
  };

  // ---------------- музыка в шаблоне ----------------
  R.audio = (c) => {
    const d = c.data || {};
    // круглая кнопка 60px по центру рамки, вокруг — расходящиеся кольца (как в оригинале)
    const col = d.circle_color || '#3d3d4d';
    const b = el('button', { class: 'audio-btn', type: 'button', 'aria-label': 'music', style: { background: col, '--ring': col } }, svg(ICON.play));
    b.style.setProperty('--ring', col);
    if (d.audio_url) {
      b.addEventListener('click', () => toggle(d.audio_url));
      audioButtons.push({ sync: () => b.replaceChildren(svg(player(d.audio_url).paused ? ICON.play : ICON.pause)) });
    }
    return el('div', { class: 'aud' }, b);
  };
  // бегущая строка: «текст • текст • …» в одну строку, высота строки = кегль, поля 8px
  R.marquee = (c) => {
    const d = c.data || {};
    const item = `${d.text || ''} ${d.separator || '•'} `;
    const run = el('div', { class: 'run' }, el('span', { text: item.repeat(12) }), el('span', { text: item.repeat(12) }));
    run.style.animationDuration = Math.max(8, 600 / (Number(d.speed) || 60) * 6) + 's';
    return el('div', { class: 'marq txtm', style: { background: d.bg || 'transparent', color: d.color || '#333', fontSize: px(d.fontSize || 18), fontFamily: d.fontFamily ? `"${d.fontFamily}"` : '' } }, run);
  };
  // лента фото: в каждой половине не меньше 8 кадров, чтобы лента не обрывалась на широком экране
  R['photo-marquee'] = (c) => {
    const d = c.data || {};
    const photos = (d.gallery_photos || []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map(p => p.url).filter(Boolean);
    const list = photos.length ? Array.from({ length: Math.ceil(8 / photos.length) }, () => photos).flat() : [];
    const gap = px(d.photo_gap ?? 4);
    const strip = () => el('span', { style: { display: 'inline-flex', gap, paddingRight: gap } },
      list.map(u => el('img', { src: u, alt: '', loading: SHOT ? 'eager' : 'lazy', onerror: e => { e.target.style.display = 'none'; }, style: { height: px(d.photo_height || 100), borderRadius: px(d.photo_border_radius || 0) } })));
    const run = el('div', { class: 'run' + (d.marquee_direction === 'right' ? ' rev' : '') }, strip(), strip());
    run.style.animationDuration = Math.max(10, list.length * (60 / (Number(d.marquee_speed) || 20)) * 2) + 's';
    // высота ленты = высота фото (как в оригинале), от верха рамки; рамка шаблона её не ограничивает
    return el('div', { class: 'marq pm', style: { height: px(d.photo_height || 100) } }, run);
  };
  // галерея: слайдер — рамка с отступом gap, кадр 3:2 сверху, смена с затуханием, стрелки и точки; сетка — плитки
  R.gallery = (c) => {
    const d = c.data || {};
    const photos = (d.gallery_photos || []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map(p => p.url).filter(Boolean);
    const gap = px(d.gallery_gap ?? 8), rad = px(d.gallery_border_radius ?? 8);
    const node = el('div', { class: 'gal', style: { background: d.gallery_background_color || 'transparent', padding: gap, borderRadius: rad } });
    if (d.gallery_layout === 'grid') {
      node.classList.add('grid');
      Object.assign(node.style, { gap, gridTemplateColumns: `repeat(${Number(d.gallery_columns) || 2}, 1fr)` });
      photos.forEach(u => node.append(el('img', { src: u, alt: '', loading: SHOT ? 'eager' : 'lazy', onerror: e => { e.target.style.display = 'none'; }, style: { borderRadius: rad } })));
      return node;
    }
    const frame = el('div', { class: 'frame', style: { borderRadius: rad } });
    const imgs = photos.map((u, i) => el('img', { src: u, alt: '', loading: i && !SHOT ? 'lazy' : 'eager', class: i ? '' : 'on' }));
    // битый первый кадр не должен оставлять пустую рамку — показываем следующий
    imgs.forEach((im, i) => { im.onerror = () => { im.classList.add('bad'); if (im.classList.contains('on') && imgs[i + 1]) { im.classList.remove('on'); imgs[i + 1].classList.add('on'); } }; });
    frame.append(...imgs);
    node.append(frame);
    if (photos.length > 1) {
      let cur = 0, timer = null;
      const dots = el('div', { class: 'dots' }, photos.map((_, i) => el('button', { type: 'button', class: i ? '' : 'on', 'aria-label': String(i + 1), onclick: () => go(i) })));
      const go = i => {
        const L = photos.length, dir = i < cur ? -1 : 1;
        let n = (i + L) % L, k = 0;
        while (imgs[n].classList.contains('bad') && k++ < L) n = (n + dir + L) % L;
        cur = n;
        imgs.forEach((im, k) => im.classList.toggle('on', k === cur));
        [...dots.children].forEach((b, k) => b.classList.toggle('on', k === cur));
        restart();
      };
      const restart = () => { clearInterval(timer); if (!SHOT) timer = setInterval(() => go(cur + 1), 4000); };
      frame.append(el('button', { type: 'button', class: 'arr l', text: '←', 'aria-label': 'prev', onclick: () => go(cur - 1) }),
        el('button', { type: 'button', class: 'arr r', text: '→', 'aria-label': 'next', onclick: () => go(cur + 1) }), dots);
      restart();
    }
    return node;
  };
  // линейные иконки программы дня (свои, сетка 48×48, рисуются цветом линии)
  const TL_ICON = {
    glasses: '<path d="M14 10h9l-1.5 11a3 3 0 0 1-6 0z" transform="rotate(-12 18 22)"/><path d="M25 10h9l-1.5 11a3 3 0 0 1-6 0z" transform="rotate(12 30 22)"/><path d="M17 26v12M13 39h8M31 26v12M27 39h8"/><path d="M24 2v4M20 4l1.5 2.5M28 4l-1.5 2.5"/>',
    rings: '<circle cx="18" cy="29" r="10"/><circle cx="30" cy="29" r="10"/><path d="M30 19l-3-4 3-4 3 4z"/>',
    dinner: '<circle cx="24" cy="25" r="11"/><circle cx="24" cy="25" r="6.5"/><path d="M6 9v7a3 3 0 0 0 6 0V9M9 9v32"/><path d="M42 9c-3 4-3 10 0 14v18"/>',
    music: '<path d="M18 35V14l18-4v21"/><path d="M18 20l18-4"/><ellipse cx="14" cy="35" rx="5" ry="3.6"/><ellipse cx="32" cy="31" rx="5" ry="3.6"/>',
    fireworks: '<path d="M24 14V5M24 14l6-6M24 14l9 0M24 14l6 6M24 14l-6 6M24 14H15M24 14l-6-6"/><path d="M15 43l9-21 9 21"/>',
    cake: '<path d="M9 40h30V26H9z"/><path d="M12 26v-6h24v6"/><path d="M24 20v-6M24 9c-1.5 1.5-1.5 3 0 4 1.5-1 1.5-2.5 0-4z"/><path d="M9 33c3 2 6 2 9 0s6-2 9 0 6 2 9 0"/>',
    camera: '<path d="M8 16h8l3-5h10l3 5h8v22H8z"/><circle cx="24" cy="26" r="7"/>',
    car: '<path d="M7 31l4-10h26l4 10v7H7z"/><circle cx="15" cy="38" r="3"/><circle cx="33" cy="38" r="3"/><path d="M11 21l3-6h20l3 6"/>',
    dance: '<circle cx="24" cy="8" r="3.5"/><path d="M24 12v14l-7 14M24 26l7 14M15 18l9 2 9-6"/>',
    heart: '<path d="M24 40S8 30 8 18a8 8 0 0 1 16-3 8 8 0 0 1 16 3c0 12-16 22-16 22z"/>',
    star: '<path d="M24 6l5 11 12 1-9 8 3 12-11-6-11 6 3-12-9-8 12-1z"/>',
  };
  TL_ICON.ring = TL_ICON.rings; TL_ICON.food = TL_ICON.dinner; TL_ICON.photo = TL_ICON.camera; TL_ICON.gift = TL_ICON.star;
  const SVGNS = 'http://www.w3.org/2000/svg';
  const sv = (tag, attrs) => { const n = document.createElementNS(SVGNS, tag); for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v); return n; };

  // программа дня: ряд дней сверху, извилистая линия с точками, события поочерёдно слева/справа,
  // сердце с номером дня едет по линии вслед за прокруткой (в снимке — в конце линии)
  R['scroll-timeline'] = (c) => {
    const d = c.data || {};
    const W = (Number(c.size.width) || 390) - 2;
    const line = d.mainColor || '#F3E3D3', heartC = d.heartColor || '#8B2332';
    const evs = d.events || [];
    const cx = W / 2, STEP = 178, Y0 = 141, TOP = 74.6, BULGE = 51.7;
    const H = Y0 + evs.length * STEP + 56;
    const node = el('div', { class: 'tl', style: { height: H + 'px', color: line } });
    const s = sv('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}` });
    // линия: короткий изгиб до первой точки, дальше S-волна — каждая дуга отходит от своего события
    let dpath = `M${cx} ${TOP}C${cx - 15.5} ${TOP + 22} ${cx - 15.5} ${Y0 - 22} ${cx} ${Y0}`;
    evs.forEach((_, i) => {
      const y = Y0 + i * STEP, side = i % 2 ? -1 : 1;
      dpath += `C${cx + side * BULGE} ${y + STEP / 3} ${cx + side * BULGE} ${y + STEP * 2 / 3} ${cx} ${y + STEP}`;
    });
    const path = sv('path', { d: dpath, fill: 'none', stroke: line, 'stroke-width': 1.8, 'stroke-linecap': 'round' });
    s.append(path);
    const dots = [];
    for (let i = 0; i <= evs.length; i++) {
      const g = sv('g', {});
      g.append(sv('circle', { cx, cy: Y0 + i * STEP, r: 9, fill: line, opacity: .18 }), sv('circle', { cx, cy: Y0 + i * STEP, r: 5.5, fill: line }));
      s.append(g); dots.push(g);
    }
    // ряд дней: текущий по центру, соседние — чуть бледнее, крайние — меньше и бледнее
    const range = (d.dayRange || []).map(String), cur = range.indexOf(String(d.dayNumber));
    const daySize = Number(d.daySize) || 16, dayFont = d.dayFont ? `"${d.dayFont}", serif` : 'serif';
    range.forEach((n, i) => {
      const k = i - (cur < 0 ? Math.floor(range.length / 2) : cur), a = Math.abs(k);
      if (a > 2) return;
      const sc = a === 2 ? .9 : 1, side = 38 * sc, x = cx + Math.sign(k) * (a ? (a === 1 ? 66 : 114) : 0);
      const g = sv('g', { opacity: a === 0 ? .85 : a === 1 ? .72 : .38 });
      g.append(sv('rect', { x: x - side / 2, y: 46 - side / 2, width: side, height: side, rx: side * .28, fill: 'none', stroke: line, 'stroke-width': 1.4 }));
      const tx = sv('text', { x, y: 46, fill: line, 'font-size': daySize * (a === 2 ? .92 : 1), 'text-anchor': 'middle', 'dominant-baseline': 'central' });
      tx.style.fontFamily = dayFont; tx.textContent = n; g.append(tx); s.append(g);
    });
    // сердце с номером дня
    const heart = sv('g', {});
    heart.append(sv('path', { d: 'M22 38C14 32 3 25 3 14 3 8 8 3 13.5 3 17.5 3 20.5 5.5 22 9 23.5 5.5 26.5 3 30.5 3 36 3 41 8 41 14 41 25 30 32 22 38Z', fill: heartC }));
    const ht = sv('text', { x: 22, y: 20, dy: 1, fill: '#fff', 'font-size': 14, 'font-weight': 700, 'text-anchor': 'middle', 'dominant-baseline': 'central' });
    ht.style.fontFamily = dayFont; ht.textContent = d.dayNumber || ''; heart.append(ht);
    s.append(heart);
    node.append(s);
    // события
    const items = evs.map((e, i) => {
      const it = el('div', { class: 'ev', style: { left: (i % 2 ? cx + 15 : cx - 171) + 'px', top: (Y0 + 1 + i * STEP) + 'px' } });
      const ic = sv('svg', { viewBox: '0 0 48 48', width: 54, height: 54, fill: 'none', stroke: line, 'stroke-width': 1.4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' });
      ic.innerHTML = TL_ICON[e.icon] || TL_ICON.star;
      it.append(ic,
        el('div', { class: 'tt', text: e.title || '', style: { fontFamily: d.titleFont ? `"${d.titleFont}", serif` : '', fontSize: px(d.titleSize || 17) } }),
        el('div', { class: 'tm', text: e.time || '', style: { fontFamily: d.timeFont ? `"${d.timeFont}", serif` : '', fontSize: px(d.timeSize || 28) } }));
      node.append(it);
      return it;
    });
    // положение сердца: точка линии на заданной высоте (поиск по длине — линия идёт сверху вниз)
    const total = () => path.getTotalLength();
    const placeAt = y => {
      const L = total(); if (!L) return;
      let lo = 0, hi = L;
      for (let k = 0; k < 22; k++) { const m = (lo + hi) / 2; if (path.getPointAtLength(m).y < y) lo = m; else hi = m; }
      const pt = path.getPointAtLength(lo);
      heart.setAttribute('transform', `translate(${pt.x - 22 * 1.15} ${pt.y - 21 * 1.15}) scale(1.15)`);
      items.forEach((it, i) => it.classList.toggle('on', pt.y >= Y0 + i * STEP - 2));
      dots.forEach((g, i) => g.setAttribute('opacity', pt.y >= Y0 + i * STEP - 2 || i === 0 ? 1 : .25));
    };
    const endY = Y0 + evs.length * STEP;
    if (SHOT) { requestAnimationFrame(() => placeAt(endY)); items.forEach(it => it.classList.add('on')); }
    else {
      let raf = 0;
      const upd = () => { raf = 0; const r = node.getBoundingClientRect(); placeAt(Math.max(Y0, Math.min(endY, innerHeight / 2 - 100 - r.top))); };
      addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(upd); }, { passive: true });
      addEventListener('resize', upd);
      requestAnimationFrame(upd);
    }
    return node;
  };

  // ---------------- сборка страницы ----------------
  const FIXED = new Set(['audio-fixed', 'fixed-wishes']);
  const TEXTY = new Set(['text', 'circle-text', 'curved-text']);   // прозрачность у текстов шаблоны не применяют
  const OWN_STYLE = new Set(['text', 'image', 'shape']);           // эти раскладывают style по своим слоям сами
  // интерактивные компоненты в оригинале всегда поверх остальных
  const Z_TOP = { button: 9998, form: 9999, form2: 9999, form3: 9999 };
  // виджеты, которые не должны выходить за колонку: ширина не больше холста − 16px, рамка остаётся на холсте
  const KEEP_INSIDE = new Set(['form', 'form2', 'form3', 'wishes-list', 'timer', 'calendar', 'calendar-pro']);
  const fixedParts = [];
  const isSet = v => v != null && v !== '' && v !== 'none' && v !== 'None';

  // движение по траектории: шаги «вправо/влево/вверх/вниз на N px за T секунд», по кругу
  function motion(node, mp) {
    const steps = ((mp && mp.steps) || []).filter(s => Number(s.px));
    if (!steps.length) return;
    const total = steps.reduce((s, st) => s + (Number(st.duration) || 5), 0);
    let x = 0, y = 0, t = 0;
    const frames = [{ transform: 'translate(0px, 0px)', offset: 0 }];
    for (const st of steps) {
      const d = Number(st.px);
      if (st.dir === 'right') x += d; else if (st.dir === 'left') x -= d; else if (st.dir === 'up') y -= d; else y += d;
      t += Number(st.duration) || 5;
      frames.push({ transform: `translate(${x}px, ${y}px)`, offset: t / total });
    }
    // снимок: без движения; зацикленный полёт — в середине пути (начало и конец обычно за краем холста), иначе — в конце
    if (SHOT || !node.animate) {
      const at = mp.loop ? 0.5 : 1;
      let i = frames.findIndex(f => f.offset >= at);
      const a = frames[Math.max(0, i - 1)], b = frames[i], k = b.offset === a.offset ? 1 : (at - a.offset) / (b.offset - a.offset);
      const xy = f => f.transform.match(/-?[\d.]+/g).map(Number);
      const [ax, ay] = xy(a), [bx, by] = xy(b);
      node.style.transform = `translate(${ax + (bx - ax) * k}px, ${ay + (by - ay) * k}px)`;
      return;
    }
    node.animate(frames, { duration: total * 1000, iterations: mp.loop ? Infinity : 1, easing: 'linear', fill: 'forwards' });
  }

  function component(c) {
    if (FIXED.has(c.type)) { fixedParts.push(c); return null; }
    const make = R[c.type];
    if (!make) return null;
    const st = c.style || {};
    const box = el('div', { class: 'c c-' + c.type, 'data-id': c.id });
    const pos = c.position || {}, size = c.size || {};
    Object.assign(box.style, {
      left: (pos.x ?? 50) + '%', top: (pos.y ?? 0) + '%', zIndex: Z_TOP[c.type] ?? pos.z ?? 0,
      width: px(size.width) || 'auto', height: px(size.height) || 'auto',
      transform: 'translate(-50%,-50%)' + (st.transform && st.transform !== 'None' ? ' ' + st.transform : ''),
    });
    // свой слой наложения (isolation) — как в оригинале, кроме картинок/фигур с тенью или фильтром
    if (!((c.type === 'image' || c.type === 'shape') && (isSet(st.filter) || isSet(st.boxShadow)))) box.classList.add('clip');
    if (!OWN_STYLE.has(c.type)) applyStyle(box, st, k => BOX_KEYS.has(k) && !(k === 'opacity' && TEXTY.has(c.type)));
    if (KEEP_INSIDE.has(c.type) && Number(size.width)) {
      const w = Number(size.width), half = `min(${w / 2}px, calc(var(--w) / 2 - 8px))`;
      box.style.width = `min(${w}px, calc(var(--w) - 16px))`;
      box.style.left = `clamp(calc(${half} + 8px), ${pos.x ?? 50}%, calc(100% - ${half} - 8px))`;
    }
    const layer = el('div', { class: 'a' });
    try { layer.append(make(c)); } catch (e) { console.warn('component', c.type, e); }
    const mp = c.data && c.data.__animation && c.data.__animation.motionPath;
    if (mp) { const m = el('div', { class: 'm' }, layer); box.append(m); motion(m, mp); }
    else box.append(layer);
    animate(layer, c);
    return box;
  }

  function renderBlock(b) {
    const st = b.style || {};
    const canvas = el('div', { class: 'canvas' });
    canvas.style.height = px(st.height) || 'auto';
    canvas.style.minHeight = px(st.minHeight) || '';
    const bgImg = st.backgroundImage && st.backgroundImage !== 'None' ? st.backgroundImage : '';
    const bgVid = st.backgroundVideo && st.backgroundVideo !== 'None' ? st.backgroundVideo : '';
    if (bgImg || bgVid) {
      const fixed = (st.backgroundAttachment || 'fixed') !== 'scroll';
      const layer = el('div', { class: fixed ? 'bgfix' : '' });
      if (!fixed) Object.assign(layer.style, { position: 'absolute', inset: 0, zIndex: -2147483647 });
      Object.assign(layer.style, {
        backgroundColor: isSet(st.backgroundColor) ? st.backgroundColor : 'transparent',
        backgroundImage: bgImg ? `url("${bgImg}")` : '',
        backgroundSize: st.backgroundSize && st.backgroundSize !== 'None' ? st.backgroundSize : '100% auto',
        backgroundRepeat: st.backgroundRepeat && st.backgroundRepeat !== 'None' ? st.backgroundRepeat : 'repeat-y',
        backgroundPosition: st.backgroundPosition && st.backgroundPosition !== 'None' ? st.backgroundPosition : 'center top',
      });
      if (bgVid) {
        const v = el('video', { src: bgVid, muted: '', autoplay: '', playsinline: '' });
        v.muted = true; v.loop = st.backgroundVideoLoop !== false && st.backgroundVideoLoop !== 'False';
        layer.append(v);
      }
      canvas.append(layer);
    }
    // под цветом блока — белая страница (как в оригинале): «transparent» и полупрозрачные цвета ложатся на белое
    const col = isSet(st.backgroundColor) ? st.backgroundColor : '';
    canvas.style.background = !bgImg && !bgVid && col ? `linear-gradient(${col}, ${col}) #fff` : '#fff';
    for (const c of b.components || []) { const n = component(c); if (n) canvas.append(n); }
    return canvas;
  }

  function renderFixedBar() {
    if (!fixedParts.length || SHOT) return;
    const bar = el('div', { class: 'fixedbar' });
    const audio = fixedParts.find(c => c.type === 'audio-fixed');
    const wish = fixedParts.find(c => c.type === 'fixed-wishes');
    const pillStyle = d => ({ background: d.button_color || '#7a6040', color: d.text_color || '#fff', fontFamily: d.font_family || '', fontSize: px(d.font_size || 16), height: px(d.button_height || 52) });
    if (audio && audio.data.audio_url) {
      const d = audio.data;
      const ring = el('span', { class: 'ring' }, svg(ICON.play));
      const b = el('button', { class: 'pill', type: 'button', style: pillStyle(d) }, ring, el('span', { text: d.button_text || '♪' }));
      b.addEventListener('click', () => toggle(d.audio_url));
      audioButtons.push({ sync: () => { const p = !player(d.audio_url).paused; b.classList.toggle('playing', p); ring.replaceChildren(svg(p ? ICON.pause : ICON.play)); } });
      bar.append(b);
    } else bar.append(el('span'));
    if (wish) {
      const d = wish.data;
      const b = el('button', { class: 'pill simple', type: 'button', style: pillStyle(d) }, svg(ICON.pen), el('span', { text: d.button_text || t('wishTitle') }));
      b.addEventListener('click', () => openWishForm(d.component_language || LANG, d.button_color));
      bar.append(b);
    }
    document.body.append(bar);
  }

  // ---------------- автопрокрутка ----------------
  // Медленно листает приглашение вниз. Останавливается от любого действия гостя (касание, колесо, клавиши,
  // перетаскивание полосы прокрутки, своя прокрутка), стоит на паузе, пока открыто окно или скрыта вкладка,
  // и выключается внизу страницы. Кнопка в углу показывает состояние и включает/выключает прокрутку.
  const AUTO_SPEED = 40;                   // px в секунду — одинаково на любых экранах
  const reduceMotion = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  function autoScroll() {
    const se = () => document.scrollingElement || document.documentElement;
    const maxY = () => se().scrollHeight - innerHeight;
    let on = false, raf = 0, last = 0, y = 0, setY = -1;
    const btn = el('button', { class: 'autoscroll', type: 'button' });
    const show = () => {
      btn.replaceChildren(svg(on ? ICON.pause : ICON.down));
      btn.classList.toggle('on', on);
      btn.setAttribute('aria-label', t(on ? 'autoOff' : 'autoOn'));
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      btn.disabled = !on && scrollY >= maxY() - 2;
    };
    const frame = now => {
      raf = 0;
      if (!on) return;
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
      last = now;
      // пока открыто окно (или конверт) — пауза, без накопления пути
      if (!document.body.classList.contains('locked')) {
        // гость прокрутил сам (полоса прокрутки, клавиши, якорь) — уступаем ему
        if (setY >= 0 && Math.abs(scrollY - setY) > 3) return stop();
        y += AUTO_SPEED * dt;
        if (y >= maxY()) { scrollTo(0, maxY()); return stop(); }
        scrollTo(0, y); setY = scrollY;
        if (Math.abs(setY - y) > 3) y = setY;   // страница сама скорректировала позицию
      }
      raf = requestAnimationFrame(frame);
    };
    function go() {
      if (on || scrollY >= maxY() - 2) return show();
      on = true; last = 0; y = scrollY; setY = -1;
      raf = requestAnimationFrame(frame); show();
    }
    function stop() {
      on = false; if (raf) cancelAnimationFrame(raf); raf = 0; show();
    }
    btn.addEventListener('click', () => (on ? stop() : go()));
    // действия гостя — стоп (кроме нажатий на саму кнопку)
    const mine = e => btn.contains(e.target);
    addEventListener('touchstart', e => { if (on && !mine(e)) stop(); }, { passive: true });
    addEventListener('wheel', () => on && stop(), { passive: true });
    addEventListener('keydown', e => { if (on && !mine(e) && !/^(Shift|Control|Alt|Meta|Tab)$/.test(e.key)) stop(); });
    // мышь на полосе прокрутки
    addEventListener('mousedown', e => { if (on && e.clientX >= se().clientWidth) stop(); });
    document.addEventListener('visibilitychange', () => { last = 0; if (document.hidden && raf) { cancelAnimationFrame(raf); raf = 0; } else if (!document.hidden && on && !raf) raf = requestAnimationFrame(frame); });
    addEventListener('scroll', () => { if (!on) show(); }, { passive: true });
    document.body.append(btn);
    // над плавающей панелью, если она есть
    const bar = document.querySelector('.fixedbar');
    if (bar) btn.style.bottom = `calc(max(14px, env(safe-area-inset-bottom)) + ${bar.offsetHeight + 10}px)`;
    show();
    return { start: () => { if (!reduceMotion()) go(); } };
  }

  // ---------------- конверт (свой) ----------------
  const THEMES = {
    champagne: ['#e7d8bf', '#5d4a2c', '#a8763a'], forest_green: ['#2f4a3a', '#f3ecdf', '#b8924a'], classic_black: ['#1d1d1d', '#efe3cc', '#9c7a3c'],
    dusty_blue: ['#8fa6ba', '#ffffff', '#45607a'], golden_luxury: ['#c9a24a', '#fffaf0', '#7a5418'], warm_beige: ['#b8a084', '#fff8ee', '#7d5a36'],
    elegant_burgundy: ['#6d1f2b', '#f7e9dc', '#c39a54'], sage_green: ['#9caf88', '#ffffff', '#5a6e46'], soft_pink: ['#ecc8cb', '#5a3a3d', '#b05a68'],
    wine_red: ['#7b1e2c', '#fbeee6', '#c39a54'], ivory: ['#f4efe4', '#5b5040', '#a8763a'], royal_blue: ['#284b8c', '#f5f1e6', '#c9a24a'],
    charcoal: ['#3a3a3a', '#f0e9df', '#a8763a'], blush: ['#e8b9ab', '#ffffff', '#a65a4a'], navy: ['#1f2e4d', '#f2e9d8', '#c9a24a'],
    terracotta: ['#c0694a', '#fff7ef', '#7a3220'], rose_gold: ['#c9958a', '#ffffff', '#8a4f45'], dusty_rose: ['#c48b8f', '#ffffff', '#7e4549'],
    pearl_white: ['#f6f3ee', '#6a6050', '#a8763a'], hot_pink: ['#e0457b', '#ffffff', '#8c1d45'],
  };
  const ENV_KEY = `env-open:${D.id || D.template_id}`;
  const envOpened = () => { try { return sessionStorage.getItem(ENV_KEY) === '1'; } catch { return false; } };
  // длинное название на конверте не должно заезжать под печать: уменьшаем шрифт, максимум 3 строки
  function fitEnvelope(paper) {
    const top = paper.querySelector('.top'), ttl = paper.querySelector('.ttl'), names = paper.querySelector('.names'), seal = paper.querySelector('.seal');
    if (!top || !seal) return;
    const room = () => seal.getBoundingClientRect().top - 14 - top.getBoundingClientRect().bottom;
    const lines = n => { const cs = getComputedStyle(n); return Math.round(n.scrollHeight / parseFloat(cs.lineHeight)); };
    let k = 0;
    while (ttl && (lines(ttl) > 3 || room() < 0) && parseFloat(getComputedStyle(ttl).fontSize) > 22 && k++ < 40) ttl.style.fontSize = (parseFloat(getComputedStyle(ttl).fontSize) - 1) + 'px';
    k = 0;
    while (names && (lines(names) > 2 || room() < 0) && parseFloat(getComputedStyle(names).fontSize) > 15 && k++ < 20) names.style.fontSize = (parseFloat(getComputedStyle(names).fontSize) - 1) + 'px';
    if (ttl && (lines(ttl) > 3 || room() < 0)) ttl.classList.add('clamp3');
  }
  // первый видимый символ строки целиком (эмодзи, флаг, буква с диакритикой)
  function firstChar(str) {
    const s = String(str || '').trim();
    if (!s) return '';
    try { if (Intl.Segmenter) return new Intl.Segmenter().segment(s)[Symbol.iterator]().next().value.segment; } catch { }
    return Array.from(s)[0];
  }
  function envelope(onOpen, onGone) {
    const e = D.envelope || {};
    const [bg, fg, seal] = THEMES[e.theme] || THEMES.champagne;
    const lang = LANG;   // язык интерфейса конверта — язык шаблона (envelope.lang бывает неверным)
    const initials = D.names.map(firstChar).filter(Boolean).join(' & ') || '♡';
    const root = el('div', { class: 'env' });
    const paper = el('div', { class: 'paper', style: { '--env': e.color || bg, '--env-text': e.text_color || fg, '--seal': seal } });
    paper.style.setProperty('--env', e.color || bg); paper.style.setProperty('--env-text', e.text_color || fg); paper.style.setProperty('--seal', seal);
    if (e.background) paper.style.backgroundImage = `url("${e.background}")`;
    const sealBtn = el('button', { class: 'seal', type: 'button', 'aria-label': t('open', lang) }, el('span', { text: initials }));
    paper.append(
      el('div', { class: 'side' }), el('div', { class: 'bottom' }), el('div', { class: 'flap' }),
      el('div', { class: 'top' }, el('div', { class: 'kicker', text: t('kicker', lang) }), D.title ? el('div', { class: 'ttl', text: D.title }) : null,
        D.names.length ? el('div', { class: 'names', text: D.names.join(' & ') }) : null),
      sealBtn, el('div', { class: 'hint', text: t('open', lang) }));
    root.append(paper);
    document.body.append(root);
    document.body.classList.add('locked');
    fitEnvelope(paper);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => fitEnvelope(paper));
    const open = () => {
      if (root.classList.contains('open')) return;
      root.classList.add('open');
      try { sessionStorage.setItem(ENV_KEY, '1'); } catch { }
      onOpen();
      setTimeout(() => { root.classList.add('gone'); document.body.classList.remove('locked'); runAnimations(); }, 750);
      setTimeout(() => { root.remove(); onGone && onGone(); }, 1600);
    };
    sealBtn.addEventListener('click', open);
    paper.addEventListener('click', ev => { if (ev.target === paper) open(); });
  }

  // Текст пользователя может быть длиннее, чем в шаблоне: уменьшаем шрифт, пока строки не влезут в рамку.
  // Сравниваем число строк с тем, сколько строк помещается по высоте (не меньше одной): в шаблонах
  // рукописные шрифты часто специально выше рамки — такие тексты оригинал не уменьшает, и мы тоже.
  // число строк: расстояние между центрами первой и последней строки / высота строки (+1); пустые строки внутри учитываются
  function lineCount(n, lh) {
    const r = document.createRange(); r.selectNodeContents(n);
    let lo = Infinity, hi = -Infinity;
    for (const b of r.getClientRects()) { if (b.width < 0.5 && b.height < 0.5) continue; const y = b.top + b.height / 2; lo = Math.min(lo, y); hi = Math.max(hi, y); }
    return hi < lo ? 0 : Math.round((hi - lo) / lh) + 1;
  }
  function overflows(n) {
    const cs = getComputedStyle(n);
    const fs = parseFloat(cs.fontSize) || 16;
    const lh = cs.lineHeight === 'normal' ? fs * 1.2 : parseFloat(cs.lineHeight);
    const room = n.clientHeight - (parseFloat(cs.paddingTop) || 0) - (parseFloat(cs.paddingBottom) || 0);
    const fit = Math.max(1, Math.floor(room / lh + 0.2));
    return lineCount(n, lh) > fit || n.scrollWidth > n.clientWidth + 2;
  }
  // Какие тексты подгонять. Оригинал не уменьшает тексты никогда (лишнее просто обрезается рамкой),
  // поэтому подгоняем только подставленные данные пользователя:
  //  — если генератор пометил такие тексты (data.__fit), то только их;
  //  — в сыром превью шаблона (без названия и имён) — ничего;
  //  — иначе (старые данные без пометок) — все тексты, чтобы длинный текст гостя не обрезался.
  const RAW = D.mode !== 'invite' && !D.title && !(D.names && D.names.length);
  const MARKED = (D.blocks || []).some(b => (b.components || []).some(c => c.data && c.data.__fit != null));
  const wantFit = c => MARKED ? !!(c.data && c.data.__fit) : !RAW;
  function fitTexts() {
    for (const n of document.querySelectorAll('.txt.fit')) {
      if (!n._base) n._base = parseFloat(getComputedStyle(n).fontSize) || 16;
      let size = n._base, guard = 0;
      n.style.fontSize = size + 'px';
      const min = Math.min(n._base, Math.max(11, n._base * 0.4));
      n.classList.remove('clampx');
      while (overflows(n) && size > min && guard++ < 60) {
        size = Math.max(min, size - Math.max(0.5, size * 0.04));
        n.style.fontSize = size + 'px';
      }
      // всё ещё не влезает — показываем начало текста и многоточие в конце (а не срезаем верх по центру)
      if (overflows(n)) {
        const cs = getComputedStyle(n);
        const lh = cs.lineHeight === 'normal' ? size * 1.2 : parseFloat(cs.lineHeight);
        const room = n.clientHeight - (parseFloat(cs.paddingTop) || 0) - (parseFloat(cs.paddingBottom) || 0);
        if (!n.querySelector(':scope > .clampx')) { const sp = el('span', { class: 'clampx' }); sp.append(...n.childNodes); n.append(sp); }
        n.firstChild.style.webkitLineClamp = String(Math.max(1, Math.floor(room / lh)));
        n.classList.add('clampx');
      }
    }
  }

  // ---------------- старт ----------------
  if (SHOT) document.documentElement.classList.add('shot');
  const page = el('main');
  for (const b of D.blocks || []) page.append(renderBlock(b));
  document.body.append(page);
  fitTexts();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitTexts);
  setTimeout(fitTexts, 1500);
  renderFixedBar();
  syncAudio();
  if (D.mode === 'invite' && D.api && D.api.album) {
    document.body.append(el('a', { class: 'albumfab', href: D.api.album, 'aria-label': 'album' }, svg(ICON.camera)));
  }
  loadWishes();

  const music = firstAudio();
  const startMusic = () => { if (music) { const a = player(music.data.audio_url); a.play().catch(() => {}); } };
  const auto = SHOT ? null : autoScroll();
  if (!SHOT && D.envelope && !envOpened()) envelope(startMusic, () => auto && auto.start());
  else {
    runAnimations();
    if (auto) setTimeout(auto.start, 1500);
    // без конверта музыка включается по первому касанию; касание самой кнопки музыки не считаем — она переключит сама
    if (!SHOT && music) {
      const once = e => {
        if (e.target.closest && e.target.closest('.pill, .audio-btn')) return;
        removeEventListener('pointerdown', once);
        if (player(music.data.audio_url).paused) startMusic();
      };
      addEventListener('pointerdown', once);
    }
  }
})();
