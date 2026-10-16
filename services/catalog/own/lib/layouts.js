// Раскладки своих шаблонов. Шапка — одна из пяти, дальше общая страница:
// приветствие и текст в рамке → календарь → место и карта → той иелері → отсчёт → анкета → пожелания → низ.
//   classic   — рисунок сверху, дата, название, имя
//   arch      — имя и название внутри стрельчатой арки
//   darkhero  — тёмная шапка во всю ширину, светлый текст
//   bordered  — как classic, плюс узорные полосы по краям во всю высоту
//   medallion — имя внутри большой розетки
// Все y — в пикселях от верха страницы; в проценты переводятся в конце (от итоговой высоты).
const O = require('./ornaments');

const SERIF = '"OwnCormorant", Georgia, serif', SANS = '"OwnMontserrat", Arial, sans-serif';
const RSVP3 = ['Иә, барамын!', 'Жұбайыммен бірге барамын', 'Өкінішке орай, келе алмаймын'];
const KIDS_MUSIC = '/media/cd/0ad6707e677a88.mp3';   // «Әуен 1» — её берут шаблоны бесік, сүндет, тілашар

// ---------- контраст (WCAG): мелкий текст акцентным цветом должен читаться (≥ 4.5:1) ----------
const rgb = c => { const m = /^#([0-9a-f]{6})$/i.exec(c || ''); return m ? [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16)) : null; };
const lum = c => rgb(c).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }).reduce((s, v, i) => s + v * [.2126, .7152, .0722][i], 0);
const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
const mix = (a, b, t) => '#' + rgb(a).map((v, i) => Math.round(v + (rgb(b)[i] - v) * t).toString(16).padStart(2, '0')).join('');
// цвет c, сдвинутый к toward, пока не станет читаемым на всех фонах bgs
function readable(c, bgs, toward) {
  if (!rgb(c) || !rgb(toward) || bgs.some(b => !rgb(b))) return c;
  for (let t = 0; t <= 1.0001; t += .05) { const m = mix(c, toward, t); if (bgs.every(b => contrast(m, b) >= 4.5)) return m; }
  return toward;
}

// spec → { tpl, media: { 'имя.svg': svg } }
function build(spec) {
  const P = spec.palette, st = { band: 'horn', divider: 'horn', rosette: 'horn8', heading: 'serif', ...(spec.style || {}) };
  const L = spec.layout || 'classic', calm = !!spec.calm;
  // акцент для мелкого текста (дата, город, дни недели, подписи отсчёта) — темнее, если золото на светлом фоне бледное
  const AT = P.accentText || readable(P.accent, [P.bg, P.card], P.ink);
  const media = {}, M = `/media/own/${spec.slug}-`;
  const file = (name, svgText) => { media[`${spec.slug}-${name}`] = svgText; return M + name; };
  const band = file('band.svg', O.bands[st.band](P.accent, P.ink));
  const divider = file('divider.svg', O.dividers[st.divider](P.accent, P.ink));
  const crest = file('corner.svg', O.corner(P.accent, P.card));
  const rosette = file('rosette.svg', O.rosettes[st.rosette](P.accent, P.ink));

  let n = 0, z = 100;
  const comps = [];
  // ас беру и другие спокойные шаблоны — только плавное появление
  const anim = (type, d = 1.6) => ({ type: calm ? 'fadeIn' : type, duration: d, isInfinite: false, motionPath: null });
  const add = (type, y, w, h, style, data, x = 50) => { const c = { id: `own${spec.id}_${++n}`, type, position: { x, y, z: ++z }, size: { width: w, height: h }, style, data }; comps.push(c); return c; };
  const text = (y, content, o = {}) => add('text', y, o.w || 340, o.h || 60, {
    fontSize: (o.size || 18) + 'px', fontFamily: o.font || SANS, color: o.color || P.ink, textAlign: 'center', fontWeight: String(o.weight || 400),
    lineHeight: String(o.lh || 1.4), ...(o.italic ? { fontStyle: 'italic' } : {}), ...(o.ls ? { letterSpacing: o.ls } : {}), ...(o.upper ? { textTransform: 'uppercase' } : {}),
    ...(o.shadow ? { textShadow: o.shadow } : {}),
  }, { content, tag: 'p', ...(o.fit ? { __fit: true } : {}), __animation: anim(o.anim || 'fadeIn', o.dur || 1.6) });
  const image = (y, src, w, h, o = {}) => add('image', y, w, h, { borderRadius: '0px', objectFit: 'contain', ...(o.rot ? { transform: `rotate(${o.rot}deg)` } : {}) },
    { src, isPhoto: false, __animation: o.spin && !calm ? { type: 'spin', duration: o.spin, isInfinite: true, motionPath: null } : o.none ? null : anim(o.anim || 'fadeIn', o.dur || 1.8) }, o.x);
  const shape = (y, w, h, style) => add('shape', y, w, h, style, { shapeType: 'rectangle' });
  const narrow = L === 'bordered';
  // рамка: двойная линия; ширина с запасом, чтобы на экране 360 px края не обрезались
  const frame = (y, h) => shape(y, narrow ? 326 : 346, h, { backgroundColor: P.card, border: `1.5px solid ${P.line}`, borderRadius: '18px', boxShadow: `inset 0 0 0 6px ${P.card}, inset 0 0 0 7px ${P.line}` });
  const heading = (y, s) => st.heading === 'caps'
    ? text(y, s, { size: 16, weight: 600, ls: '0.26em', upper: true, color: AT, h: 60, w: narrow ? 300 : 360, anim: 'slideInUp' })
    : text(y, s, { font: SERIF, size: narrow ? 26 : 30, weight: 500, h: 70, w: narrow ? 300 : 360, anim: 'slideInUp' });
  const motif = (pal = P) => spec.motif ? file('motif.svg', spec.motif(pal, O)) : null;
  // полосы — 390×66: на экране 390 px узор не обрезается по краям
  const bandAt = (y, src = band, o = {}) => image(y, src, 390, 66, o);

  // ---------- шапка ----------
  let y;
  if (L === 'classic' || L === 'bordered') {
    bandAt(38, band, { anim: 'slideInDown' });
    const mh = spec.motifH || 200, my = 100 + mh / 2;
    if (spec.motif) image(my, motif(), spec.motifW || 240, mh, { anim: 'zoomIn', dur: 1.8 });
    const k = (spec.motif ? my + mh / 2 : 90) + 40;
    text(k, 'DATE', { size: 15, weight: 600, ls: '0.3em', color: AT, h: 40, anim: 'slideInDown' });
    text(k + 60, 'TITLE', { font: SERIF, size: 30, weight: 500, h: 90, fit: true, anim: 'slideInUp' });
    text(k + 175, 'ИМЯ', { font: SERIF, size: 58, weight: 500, italic: true, h: 130, w: 360, fit: true, color: P.name, anim: 'zoomIn', dur: 1.8 });
    image(k + 275, divider, 260, 46);
    y = k + 355;
  } else if (L === 'arch') {
    bandAt(38, band, { anim: 'slideInDown' });
    image(360, file('arch.svg', O.arch(P.accent, P.ink, P.card)), 360, 480, { anim: 'fadeIn', dur: 2 });
    if (spec.motif) image(238, motif(), Math.min(150, spec.motifW || 150), Math.min(118, spec.motifH || 118), { anim: 'zoomIn', dur: 1.8 });
    text(320, 'DATE', { size: 14, weight: 600, ls: '0.28em', color: AT, h: 36, w: 240 });
    text(376, 'TITLE', { font: SERIF, size: 26, weight: 500, h: 80, w: 240, fit: true, anim: 'slideInUp' });
    text(478, 'ИМЯ', { font: SERIF, size: 50, weight: 500, italic: true, h: 120, w: 250, fit: true, color: P.name, anim: 'zoomIn', dur: 1.8 });
    image(560, divider, 200, 36);
    y = 640;
  } else if (L === 'darkhero') {
    const D = { ...P, ink: P.light, accent: P.accent, name: P.light, soft: P.dark, card: P.dark };
    const mh = spec.motifH || 200, my = 110 + mh / 2, heroH = (spec.motif ? my + mh / 2 : 100) + 40 + 175 + 130;
    shape(heroH / 2, 430, heroH, { backgroundColor: P.dark, borderRadius: '0px' });
    const bandDark = file('band-dark.svg', O.bands[st.band](P.accent, P.light));
    bandAt(38, bandDark, { anim: 'slideInDown' });
    if (spec.motif) image(my, motif(D), spec.motifW || 240, mh, { anim: 'zoomIn', dur: 1.8 });
    const k = (spec.motif ? my + mh / 2 : 100) + 40;
    text(k, 'DATE', { size: 15, weight: 600, ls: '0.3em', color: P.accent, h: 40 });
    text(k + 60, 'TITLE', { font: SERIF, size: 30, weight: 500, h: 90, fit: true, color: P.light, anim: 'slideInUp' });
    text(k + 175, 'ИМЯ', { font: SERIF, size: 58, weight: 500, italic: true, h: 130, w: 360, fit: true, color: P.light, anim: 'zoomIn', dur: 1.8 });
    bandAt(heroH - 40, bandDark);
    y = heroH + 50;
  } else if (L === 'medallion') {
    bandAt(38, band, { anim: 'slideInDown' });
    text(120, 'DATE', { size: 15, weight: 600, ls: '0.3em', color: AT, h: 40, anim: 'slideInDown' });
    const inner = `<circle r="76" fill="${P.card}" stroke="${P.accent}" stroke-width="1.6"/>`;
    image(340, file('medallion.svg', O.rosettes[st.rosette](P.accent, P.ink, inner)), 340, 340, { anim: 'zoomIn', dur: 2 });
    text(340, 'ИМЯ', { font: SERIF, size: 34, weight: 500, italic: true, h: 120, w: 186, fit: true, color: P.name, anim: 'fadeIn', dur: 2.2 });
    text(545, 'TITLE', { font: SERIF, size: 30, weight: 500, h: 90, fit: true, anim: 'slideInUp' });
    if (spec.motif) image(650, motif(), Math.min(200, spec.motifW || 200), Math.min(110, spec.motifH || 110), { anim: 'fadeIn' });
    y = spec.motif ? 730 : 620;
  } else throw new Error(`#${spec.id}: неизвестная раскладка ${L}`);

  // ---------- приветствие и текст (рамка с орнаментом по центру верхней и нижней линии) ----------
  frame(y + 170, 360);
  image(y - 10, crest, 84, 40);
  image(y + 350, crest, 84, 40, { rot: 180 });
  text(y + 50, spec.greeting || 'Құрметті ағайын-туыс,\nқұда-жекжат, дос-жаран!', { font: SERIF, size: 26, weight: 500, italic: true, h: 80, w: 320 });
  text(y + 205, 'INVITE_TEXT', { size: 17, lh: 1.6, h: 220, w: narrow ? 290 : 310, fit: true });
  y += 390;

  // ---------- дата ----------
  heading(y + 30, spec.dateTitle || 'Той салтанаты');
  add('calendar', y + 310, 300, 470, {}, { backgroundColor: 'transparent', borderRadius: 8, titleFontSize: 16, titleFontFamily: 'OwnMontserrat', titleColor: P.ink,
    calendarLanguage: 'kz', event_dates: [{ date: '2027-06-12', time: '18:00', title: null, description: null }], padding: 20, titleText: '',
    weekdaysFontSize: 12, weekdaysFontFamily: 'OwnMontserrat', weekdaysColor: AT, daysFontSize: 15, daysFontFamily: 'OwnMontserrat', daysColor: P.ink,
    eventMarkerType: spec.marker || 'heart', eventMarkerColor: AT, eventMarkerSize: 28, ...(calm ? { eventMarkerStatic: true } : {}), __animation: anim('fadeIn', 1.8) });
  y += 650;   // запас на месяцы в 6 недель

  // ---------- место ----------
  image(y, divider, 260, 46);
  heading(y + 70, 'Мекенжайы');
  text(y + 130, 'CITY', { size: 15, weight: 600, ls: '0.2em', upper: true, color: AT, h: 40, fit: true });
  text(y + 195, 'ADDRESS', { size: 18, lh: 1.5, h: 90, w: narrow ? 300 : 330, fit: true });
  add('button', y + 285, 200, 48, {}, { backgroundColor: P.button, borderRadius: 24, text: 'Картаны ашу', url: 'https://example.com', textColor: P.buttonText,
    borderColor: P.button, borderWidth: 0, openInNewTab: true, fontSize: 15, fontFamily: 'OwnMontserrat', fontWeight: 600, __animation: anim('zoomIn', 1.4) });
  y += 380;

  // ---------- той иелері ----------
  image(y, divider, 260, 46);
  heading(y + 70, spec.hostsTitle || 'Той иелері');
  text(y + 140, 'HOST', { font: SERIF, size: 24, weight: 500, italic: true, h: 90, w: narrow ? 300 : 340, fit: true });
  y += 230;

  // ---------- отсчёт ----------
  const timer = spec.timer === undefined ? 'Тойға дейін қалды:' : spec.timer;
  if (timer) {
    frame(y + 85, 170);
    add('timer', y + 85, 320, 150, {}, { event_date: '2027-06-12T13:00:00.000Z', event_title: timer, timezone: 'Asia/Almaty', show_days: true, show_hours: true,
      show_minutes: true, show_seconds: true, timerLanguage: 'kz', backgroundColor: 'transparent', borderRadius: 8, titleFontSize: 14, titleFontFamily: 'OwnMontserrat',
      titleColor: AT, numbersFontSize: 30, numbersFontFamily: 'OwnMontserrat', numbersColor: P.ink, labelsFontSize: 12, labelsFontFamily: 'OwnMontserrat',
      labelsColor: AT, showLabels: true, spacing: 14, __animation: anim('fadeIn', 1.6) });
    y += 230;
  }

  // ---------- анкета ----------
  const rsvp = spec.rsvp || RSVP3;
  image(y, divider, 260, 46);
  heading(y + 75, spec.rsvpTitle || 'Тойға келетініңізді растаңыз');
  add('form2', y + 330, narrow ? 326 : 380, 400, {}, { form_id: `form2_own${spec.id}`, form_fields: [{ id: '1', field_type: 'text', field_label: 'Есіміңіз', placeholder: 'Аты-жөніңіз', is_required: true, field_name: 'field_1' }],
    form_buttons: rsvp.map((t, i) => ({ id: String(i + 1), button_text: t, button_value: rsvp.length === 2 ? ['yes', 'no'][i] : ['yes', 'plus_one', 'no'][i] })),
    field_fontSize: 15, field_fontFamily: 'OwnMontserrat', field_color: P.ink, field_backgroundColor: '#ffffff', field_borderColor: P.line, field_borderRadius: 12,
    button_fontSize: 15, button_fontFamily: 'OwnMontserrat', label_fontSize: 14, label_fontFamily: 'OwnMontserrat', label_color: P.ink, formLang: 'kz', lang: 'kz',
    mainColor: P.button, submit_button_text: 'ЖАУАП БЕРУ', modal_button_text: 'ЖІБЕРУ', modal_title: 'Есіміңізді жазыңыз', submit_button_backgroundColor: P.button,
    submit_button_textColor: P.buttonText, submit_button_borderRadius: 24, submit_button_fontSize: 15, submit_button_fontFamily: 'OwnMontserrat',
    option_fontSize: 16, option_fontFamily: 'OwnMontserrat', option_color: P.ink, option_backgroundColor: P.card, option_borderRadius: 14, option_height: 56, submit_button_height: 54, field_height: 48,
    field_borderWidth: 1, button_color: P.button, __animation: anim('fadeIn', 1.6) });
  y += rsvp.length === 2 ? 430 : 500;

  // ---------- пожелания ----------
  const wishes = spec.wishes !== false;
  if (wishes) {
    image(y, divider, 260, 46);
    heading(y + 70, spec.wishesTitle || 'Ізгі тілектер');
    add('wishes-list', y + 300, narrow ? 326 : 400, 380, {}, { form_lang: 'kz', button_text: 'БАРЛЫҚ ТІЛЕКТЕРДІ ОҚУ', title_color: P.ink, card_bg_color: '#ffffff',
      button_color: P.button, font_family: 'OwnMontserrat', auto_scroll_interval: 3500, __animation: anim('fadeIn', 1.6) });
    y += 470;
  }

  // ---------- низ ----------
  image(y + 110, rosette, 180, 180, { spin: 60 });
  text(y + 260, spec.footer || 'Сіздерді асыға күтеміз!', { font: SERIF, size: 26, weight: 500, italic: true, h: 90, w: 340 });
  bandAt(y + 358);
  // музыка и кнопка пожеланий висят внизу экрана — оставляем под ними место, чтобы не закрывали нижнюю полосу
  const music = spec.music === undefined ? KIDS_MUSIC : spec.music;
  const height = y + 400 + (music || wishes ? 76 : 0);

  // узорные полосы по краям — во всю высоту
  if (L === 'bordered') {
    const s = file('side.svg', O.side(P.accent, P.ink, height));
    image(height / 2, s, 26, height, { x: 3.4, none: true });
    image(height / 2, s, 26, height, { x: 96.6, none: true });
  }

  if (music) add('audio-fixed', 0, 200, 80, {}, { audio_url: music, button_text: 'Әуен қосу', button_color: P.button, text_color: P.buttonText, font_family: 'OwnMontserrat', font_size: 16, button_height: 52 });
  if (wishes) add('fixed-wishes', 0, 200, 80, {}, { button_text: 'ТІЛЕК ЖАЗУ', button_color: P.button, text_color: P.buttonText, font_family: 'OwnMontserrat', font_size: 16, button_height: 52, component_language: 'kz' });

  for (const c of comps) c.position.y = +(c.position.y / height * 100).toFixed(4);
  for (const c of comps) if (c.data && c.data.__animation === null) delete c.data.__animation;
  return {
    media,
    tpl: {
      id: spec.id, category: spec.category, lang: 'kz', updated_at: '2026-10-16T00:00:00', own: true,
      envelope: JSON.stringify({ theme: 'champagne', lang: 'kz', color: spec.envelope[0], text_color: spec.envelope[1], background: null, button_image: null }),
      blocks: [{ type: 'canvas', style: { backgroundColor: P.bg, backgroundImage: '', minHeight: '500px', height: height + 'px', margin: '0px', padding: '20px', borderRadius: '0px', border: 'none', boxShadow: 'none' }, components: comps }],
    },
  };
}

module.exports = { build, SERIF, SANS, RSVP3, KIDS_MUSIC, contrast, readable };
