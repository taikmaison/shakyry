// Сборка своих шаблонов: орнаменты (SVG, рисуем сами) → own/media, шаблоны → own/templates/<id>.json,
// карточки каталога → own/catalog.json, шрифты (OFL) → own/fonts.css. Всё в git — права наши.
//   node own/build.js            (из папки services/catalog)
// Превью (own/previews/<id>.webp) — tools/previews.js при запущенном сайте.
const fs = require('fs');
const path = require('path');

const OWN = __dirname;
const write = (rel, s) => { fs.mkdirSync(path.dirname(path.join(OWN, rel)), { recursive: true }); fs.writeFileSync(path.join(OWN, rel), s); };

// ---------- шрифты (Cormorant Garamond, Montserrat — SIL OFL, полные: с казахскими буквами и ₸) ----------
write('fonts.css', `/* Свои шаблоны: шрифты под SIL Open Font License (own/fonts/OFL.txt), с казахскими буквами */
@font-face{font-family:"OwnCormorant";src:url("/fonts/own/OwnCormorant.woff") format("woff");font-weight:300 700;font-style:normal;font-display:swap;}
@font-face{font-family:"OwnCormorant";src:url("/fonts/own/OwnCormorantItalic.woff") format("woff");font-weight:300 700;font-style:italic;font-display:swap;}
@font-face{font-family:"OwnMontserrat";src:url("/fonts/own/OwnMontserrat.woff") format("woff");font-weight:100 900;font-style:normal;font-display:swap;}
`);
const SERIF = '"OwnCormorant", Georgia, serif', SANS = '"OwnMontserrat", Arial, sans-serif';

// ---------- орнаменты ----------
// қошқар мүйіз (бараний рог): стебель снизу, рог закручивается наружу и внутрь; левая половина — зеркало
const HORN = 'M0,46 C0,22 4,6 18,-4 C34,-15 56,-10 60,6 C64,22 50,34 37,29 C26,25 27,10 38,10 C45,10 47,18 42,21';
const horn = (c, sw = 5) => `<g fill="none" stroke="${c}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><path d="${HORN}"/><path d="${HORN}" transform="scale(-1,1)"/></g>`;
const diamond = (c, s = 7) => `<path d="M0,${-s} L${s * .8},0 L0,${s} L${-s * .8},0 Z" fill="${c}"/>`;
const svg = (w, h, body, vb = `0 0 ${w} ${h}`) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${vb}">${body}</svg>\n`;

// полоса из рогов (верх и низ страницы)
function band(c, c2) {
  let s = `<line x1="6" y1="8" x2="424" y2="8" stroke="${c}" stroke-width="1.6"/><line x1="6" y1="64" x2="424" y2="64" stroke="${c}" stroke-width="1.6"/>`;
  for (let i = 0; i < 6; i++) {
    const x = 35 + i * 72;
    s += `<g transform="translate(${x},38) scale(.42)">${horn(c, 7)}</g><g transform="translate(${x},55)">${diamond(c2, 4)}</g>`;
    if (i < 5) s += `<g transform="translate(${x + 36},36)">${diamond(c2, 3.5)}</g>`;
  }
  return svg(430, 72, s);
}
// розетка: 8 рогов по кругу, двойное кольцо, цветок в центре
function rosette(c, c2, inner = '') {
  let s = `<g transform="translate(130,130)"><circle r="122" fill="none" stroke="${c}" stroke-width="2.4"/><circle r="113" fill="none" stroke="${c}" stroke-width="1"/>`;
  for (let k = 0; k < 8; k++) s += `<g transform="rotate(${k * 45}) translate(0,-72) scale(.52)">${horn(c, 6)}</g><g transform="rotate(${k * 45 + 22.5}) translate(0,-100)">${diamond(c2, 5)}</g>`;
  s += inner || `<circle r="30" fill="none" stroke="${c}" stroke-width="2"/>${[0, 90, 180, 270].map(a => `<ellipse rx="7" ry="17" transform="rotate(${a}) translate(0,-14)" fill="${c2}"/>`).join('')}<circle r="5" fill="${c}"/>`;
  return svg(260, 260, s + '</g>');
}
// разделитель: линии и пара рогов
function divider(c, c2) {
  return svg(260, 46, `<line x1="10" y1="26" x2="98" y2="26" stroke="${c}" stroke-width="1.4"/><line x1="162" y1="26" x2="250" y2="26" stroke="${c}" stroke-width="1.4"/>
<g transform="translate(130,24) scale(.4)">${horn(c, 7)}</g><g transform="translate(130,40)">${diamond(c2, 4)}</g><circle cx="104" cy="26" r="2.5" fill="${c2}"/><circle cx="156" cy="26" r="2.5" fill="${c2}"/>`);
}
// уголок рамки
function corner(c) {
  return svg(90, 90, `<path d="M6,84 L6,6 L84,6" fill="none" stroke="${c}" stroke-width="2"/><g transform="translate(30,30) rotate(-45) scale(.36)">${horn(c, 7)}</g>`);
}
// тұсаукесер: ала жіп (чёрно-белая верёвка), перерезанная посередине, и шаги малыша над ней
function tusau(c, ink) {
  let rope = '';
  const seg = (x, i) => `<path d="M${x},102 L${x + 12},102 L${x + 8},116 L${x - 4},116 Z" fill="${i % 2 ? '#ffffff' : '#262626'}" stroke="#262626" stroke-width="1.4" stroke-linejoin="round"/>`;
  for (let i = 0, x = 14; x < 136; i++, x += 12) rope += seg(x, i);
  for (let i = 0, x = 172; x < 300; i++, x += 12) rope += seg(x, i + 1);
  // распушённые концы перерезанной верёвки
  rope += `<path d="M138,104 l8,-6 M140,109 l9,0 M138,114 l8,6" stroke="#262626" stroke-width="1.6" stroke-linecap="round"/><path d="M172,104 l-8,-6 M170,109 l-9,0 M172,114 l-8,6" stroke="#262626" stroke-width="1.6" stroke-linecap="round"/>`;
  const foot = (x, y, a, flip) => `<g transform="translate(${x},${y}) rotate(${a}) scale(${flip ? -1.15 : 1.15},1.15)"><path d="M1,16 C-4,16 -6,11 -5,5 C-4,0 -7,-6 -5,-11 C-3,-15 3,-16 6,-12 C9,-8 8,-2 6,3 C5,8 6,16 1,16 Z" fill="${c}"/>${[[-3, -19, 3], [1.6, -20.6, 2.3], [5, -19.2, 2], [7.6, -16.6, 1.75], [9.2, -13.2, 1.5]].map(([dx, dy, r]) => `<circle cx="${dx}" cy="${dy}" r="${r}" fill="${c}"/>`).join('')}</g>`;
  const steps = foot(70, 70, 20, 0) + foot(92, 56, 28, 1) + foot(146, 52, 40, 0) + foot(176, 38, 46, 1) + foot(222, 34, 56, 0) + foot(246, 22, 62, 1);
  return svg(310, 140, `${steps}${rope}<g transform="translate(155,128)">${diamond(c, 4)}</g>`);
}
// бесік (колыбель) сбоку: торцевые доски, перекладина-арқалық, полозья, орнамент; над ней месяц и звёзды
function besik(c, ink, soft) {
  const star = (x, y, r) => `<path d="M${x},${y - r} L${x + r * .3},${y - r * .3} L${x + r},${y} L${x + r * .3},${y + r * .3} L${x},${y + r} L${x - r * .3},${y + r * .3} L${x - r},${y} L${x - r * .3},${y - r * .3} Z" fill="${c}"/>`;
  return svg(280, 240, `
<path d="M196,40 a26,26 0 1,0 30,30 a20,20 0 1,1 -30,-30 Z" fill="${c}"/>${star(70, 34, 8)}${star(106, 16, 5)}${star(250, 110, 5)}${star(30, 92, 4)}
<path d="M28,214 Q140,238 252,214" fill="none" stroke="${ink}" stroke-width="7" stroke-linecap="round"/>
<path d="M58,128 L222,128 L214,186 Q140,200 66,186 Z" fill="${soft}" stroke="${ink}" stroke-width="3.5" stroke-linejoin="round"/>
<rect x="38" y="86" width="22" height="128" rx="9" fill="${soft}" stroke="${ink}" stroke-width="3.5"/><rect x="220" y="86" width="22" height="128" rx="9" fill="${soft}" stroke="${ink}" stroke-width="3.5"/>
<path d="M49,92 Q140,70 231,92" fill="none" stroke="${ink}" stroke-width="7" stroke-linecap="round"/><rect x="126" y="76" width="28" height="10" rx="5" fill="${c}"/>
<g transform="translate(140,160) scale(.5)">${horn(c, 7)}</g><g transform="translate(96,160) scale(.3)">${horn(c, 8)}</g><g transform="translate(184,160) scale(.3)">${horn(c, 8)}</g>`);
}
// шаңырақ (для ас беру): кольцо с уықтарами и перекрещённые изогнутые күлдіреуіштер
function shanyrak(c, c2) {
  let s = '<g transform="translate(130,130)">';
  for (let a = 0; a < 360; a += 15) s += `<line x1="0" y1="-106" x2="0" y2="-121" stroke="${c}" stroke-width="2.2" stroke-linecap="round" transform="rotate(${a})"/>`;
  s += `<circle r="100" fill="none" stroke="${c}" stroke-width="6"/><circle r="91" fill="none" stroke="${c2}" stroke-width="1.4"/><clipPath id="in"><circle r="89"/></clipPath><g clip-path="url(#in)" fill="none" stroke="${c2}" stroke-width="3.2" stroke-linecap="round">`;
  for (const d of [-32, 0, 32]) s += `<path d="M-100,${d * 1.1} Q0,${d * 0.55} 100,${d * 1.1}"/><path d="M${d * 1.1},-100 Q${d * 0.55},0 ${d * 1.1},100"/>`;
  s += `</g><circle r="9" fill="${c2}"/>`;
  return svg(260, 260, s + '</g>');
}
// сүндет: розетка, внутри месяц со звездой
const crescent = c => `<path d="M8,-26 a28,28 0 1,0 0,52 a22,22 0 1,1 0,-52 Z" fill="${c}"/><path d="M18,-6 L21,1 L28,1 L22,5 L24,12 L18,8 L12,12 L14,5 L8,1 L15,1 Z" fill="${c}"/>`;

// ---------- шаблон ----------
function template(spec) {
  const P = spec.palette;
  let n = 0, z = 100;
  const comps = [];
  const anim = (type, d = 1.6) => ({ type, duration: d, isInfinite: false, motionPath: null });
  // y — в пикселях от верха; в проценты переводится в конце, от итоговой высоты страницы
  const add = (type, y, w, h, style, data, x = 50) => { comps.push({ id: `own${spec.id}_${++n}`, type, position: { x, y, z: ++z }, size: { width: w, height: h }, style, data }); };
  const text = (y, content, o = {}) => add('text', y, o.w || 340, o.h || 60, {
    fontSize: (o.size || 18) + 'px', fontFamily: o.font || SANS, color: o.color || P.ink, textAlign: 'center', fontWeight: String(o.weight || 400),
    lineHeight: String(o.lh || 1.4), ...(o.italic ? { fontStyle: 'italic' } : {}), ...(o.ls ? { letterSpacing: o.ls } : {}), ...(o.upper ? { textTransform: 'uppercase' } : {}),
  }, { content, tag: 'p', ...(o.fit ? { __fit: true } : {}), __animation: anim(o.anim || 'fadeIn', o.dur || 1.6) });
  const image = (y, src, w, h, o = {}) => add('image', y, w, h, { borderRadius: '0px', objectFit: 'contain', ...(o.rot ? { transform: `rotate(${o.rot}deg)` } : {}) }, { src, isPhoto: false, __animation: o.spin ? { type: 'spin', duration: o.spin, isInfinite: true, motionPath: null } : anim(o.anim || 'fadeIn', o.dur || 1.8) }, o.x);
  const frame = (y, h) => add('shape', y, 372, h, { backgroundColor: P.card, border: `1.5px solid ${P.line}`, borderRadius: '18px' }, { shapeType: 'rectangle' });
  const M = `/media/own/${spec.slug}-`;

  // верх: полоса, мотив, вид тоя, название, имя
  image(40, M + 'band.svg', 430, 72, { anim: 'slideInDown' });
  if (spec.motif) image(250, M + 'motif.svg', spec.motifW, spec.motifH, { anim: 'zoomIn', dur: 1.8 });
  text(spec.y.kicker, 'DATE', { size: 15, weight: 600, ls: '0.3em', color: P.accent, h: 40, anim: 'slideInDown' });
  text(spec.y.title, 'TITLE', { font: SERIF, size: 30, weight: 500, h: 90, fit: true, anim: 'slideInUp' });
  text(spec.y.name, 'ИМЯ', { font: SERIF, size: 58, weight: 500, italic: true, h: 130, w: 360, fit: true, color: P.name, anim: 'zoomIn', dur: 1.8 });
  image(spec.y.name + 100, M + 'divider.svg', 260, 46);

  // приветствие и текст приглашения — в рамке
  let y = spec.y.name + 180;
  frame(y + 140, 300);
  image(y + 22, M + 'corner.svg', 56, 56, { x: 14 });
  image(y + 258, M + 'corner.svg', 56, 56, { x: 86, rot: 180 });
  text(y + 50, spec.greeting, { font: SERIF, size: 26, weight: 500, italic: true, h: 80 });
  text(y + 175, 'INVITE_TEXT', { size: 17, lh: 1.6, h: 170, w: 320, fit: true });
  y += 330;

  // дата: календарь
  text(y + 30, spec.dateTitle, { font: SERIF, size: 30, weight: 500, h: 60, anim: 'slideInUp' });
  add('calendar', y + 310, 300, 470, {}, { backgroundColor: 'transparent', borderRadius: 8, titleFontSize: 16, titleFontFamily: 'OwnMontserrat', titleColor: P.ink,
    calendarLanguage: 'kz', event_dates: [{ date: '2027-06-12', time: '18:00', title: null, description: null }], padding: 20, titleText: '',
    weekdaysFontSize: 12, weekdaysFontFamily: 'OwnMontserrat', weekdaysColor: P.accent, daysFontSize: 15, daysFontFamily: 'OwnMontserrat', daysColor: P.ink,
    eventMarkerType: spec.marker || 'heart', eventMarkerColor: P.accent, eventMarkerSize: 40, __animation: anim('fadeIn', 1.8) });
  y += 610;

  // место
  image(y, M + 'divider.svg', 260, 46);
  text(y + 70, 'Мекенжайы', { font: SERIF, size: 30, weight: 500, h: 60, anim: 'slideInUp' });
  text(y + 130, 'CITY', { size: 15, weight: 600, ls: '0.2em', upper: true, color: P.accent, h: 40, fit: true });
  text(y + 195, 'ADDRESS', { size: 18, lh: 1.5, h: 90, w: 330, fit: true });
  add('button', y + 285, 200, 48, {}, { backgroundColor: P.button, borderRadius: 24, text: 'Картаны ашу', url: 'https://example.com', textColor: P.buttonText,
    borderColor: P.button, borderWidth: 0, openInNewTab: true, fontSize: 15, fontFamily: 'OwnMontserrat', fontWeight: 600, __animation: anim('zoomIn', 1.4) });
  y += 380;

  // той иелері
  image(y, M + 'divider.svg', 260, 46);
  text(y + 70, spec.hostsTitle, { font: SERIF, size: 30, weight: 500, h: 60, anim: 'slideInUp' });
  text(y + 140, 'HOST', { font: SERIF, size: 24, weight: 500, italic: true, h: 90, w: 340, fit: true });
  y += 230;

  // обратный отсчёт
  if (spec.timer) {
    frame(y + 85, 170);
    add('timer', y + 85, 340, 150, {}, { event_date: '2027-06-12T13:00:00.000Z', event_title: spec.timer, timezone: 'Asia/Almaty', show_days: true, show_hours: true,
      show_minutes: true, show_seconds: true, timerLanguage: 'kz', backgroundColor: 'transparent', borderRadius: 8, titleFontSize: 14, titleFontFamily: 'OwnMontserrat',
      titleColor: P.accent, numbersFontSize: 34, numbersFontFamily: 'OwnCormorant', numbersColor: P.ink, labelsFontSize: 11, labelsFontFamily: 'OwnMontserrat',
      labelsColor: P.accent, showLabels: true, spacing: 14, __animation: anim('fadeIn', 1.6) });
    y += 230;
  }

  // анкета
  image(y, M + 'divider.svg', 260, 46);
  text(y + 75, spec.rsvpTitle, { font: SERIF, size: 28, weight: 500, h: 90, w: 340, anim: 'slideInUp' });
  add('form2', y + 330, 380, 400, {}, { form_id: `form2_own${spec.id}`, form_fields: [{ id: '1', field_type: 'text', field_label: 'Есіміңіз', placeholder: 'Есіміңізді енгізіңіз', is_required: true, field_name: 'field_1' }],
    form_buttons: spec.rsvp.map((t, i) => ({ id: String(i + 1), button_text: t, button_value: ['yes', 'plus_one', 'no'][spec.rsvp.length === 2 && i === 1 ? 2 : i] })),
    field_fontSize: 15, field_fontFamily: 'OwnMontserrat', field_color: P.ink, field_backgroundColor: '#ffffff', field_borderColor: P.line, field_borderRadius: 12,
    button_fontSize: 15, button_fontFamily: 'OwnMontserrat', label_fontSize: 14, label_fontFamily: 'OwnMontserrat', label_color: P.ink, formLang: 'kz', lang: 'kz',
    mainColor: P.button, submit_button_text: 'ЖАУАП БЕРУ', modal_button_text: 'ЖІБЕРУ', modal_title: 'Есіміңізді жазыңыз:', submit_button_backgroundColor: P.button,
    submit_button_textColor: P.buttonText, submit_button_borderRadius: 24, submit_button_fontSize: 15, submit_button_fontFamily: 'OwnMontserrat',
    option_fontSize: 16, option_fontFamily: 'OwnMontserrat', option_color: P.ink, option_borderRadius: 14, option_height: 56, submit_button_height: 54, field_height: 48,
    field_borderWidth: 1, button_color: P.button, __animation: anim('fadeIn', 1.6) });
  y += spec.rsvp.length === 2 ? 520 : 600;

  // пожелания
  if (spec.wishes) {
    image(y, M + 'divider.svg', 260, 46);
    text(y + 70, spec.wishesTitle, { font: SERIF, size: 30, weight: 500, h: 60, anim: 'slideInUp' });
    add('wishes-list', y + 300, 400, 380, {}, { form_lang: 'kz', button_text: 'БАРЛЫҚ ТІЛЕКТЕРДІ ОҚУ', title_color: P.ink, card_bg_color: '#ffffff',
      button_color: P.button, font_family: 'OwnMontserrat', auto_scroll_interval: 3500, __animation: anim('fadeIn', 1.6) });
    y += 540;
  }

  // низ: розетка/мотив поменьше, прощальная строка, полоса
  image(y + 110, M + 'rosette.svg', 180, 180, spec.calm ? {} : { spin: 60 });
  text(y + 260, spec.footer, { font: SERIF, size: 26, weight: 500, italic: true, h: 90, w: 340 });
  image(y + 360, M + 'band.svg', 430, 72);
  const height = y + 400;

  // музыка и кнопка пожеланий — внизу экрана
  if (spec.music) add('audio-fixed', 0, 200, 80, {}, { audio_url: spec.music, button_text: 'Әуен қосу', button_color: P.button, text_color: P.buttonText, font_family: 'OwnMontserrat', font_size: 16, button_height: 52 });
  if (spec.wishes) add('fixed-wishes', 0, 200, 80, {}, { button_text: 'ТІЛЕК ЖАЗУ', button_color: P.button, text_color: P.buttonText, font_family: 'OwnMontserrat', font_size: 16, button_height: 52, component_language: 'kz' });

  for (const c of comps) c.position.y = +(c.position.y / height * 100).toFixed(4);
  return {
    id: spec.id, category: spec.category, lang: 'kz', updated_at: '2026-10-16T00:00:00', own: true,
    envelope: JSON.stringify({ theme: 'champagne', lang: 'kz', color: spec.envelope[0], text_color: spec.envelope[1], background: null, button_image: null }),
    blocks: [{ type: 'canvas', style: { backgroundColor: P.bg, backgroundImage: '', minHeight: '500px', height: height + 'px', margin: '0px', padding: '20px', borderRadius: '0px', border: 'none', boxShadow: 'none' }, components: comps }],
  };
}

// ---------- четыре шаблона ----------
const KIDS_MUSIC = '/media/cd/0ad6707e677a88.mp3';   // «Әуен 1» — её же берут шаблоны бесік, сүндет, тілашар
const RSVP3 = ['Иә, барамын!', 'Жұбайыммен бірге барамын', 'Өкінішке орай, келе алмаймын'];
const SPECS = [
  { id: 9001, slug: 'tusau', category: 'tusaukeser', kicker: 'ТҰСАУКЕСЕР ТОЙЫ', height: 4600,
    palette: { bg: '#f7f3ea', card: '#fffdf8', line: '#dccfb0', ink: '#2e3b33', name: '#2e4a3e', accent: '#a87d2c', soft: '#efe5cf', button: '#2e4a3e', buttonText: '#fbf4e2' },
    envelope: ['#2e4a3e', '#f3e7c8'], motif: (P) => tusau(P.accent, P.ink), motifW: 330, motifH: 150,
    y: { kicker: 400, title: 460, name: 560 }, greeting: 'Құрметті ағайын-туыс, дос-жаран!', dateTitle: 'Той салтанаты', hostsTitle: 'Той иелері',
    timer: 'Тойға дейін қалды:', rsvpTitle: 'Тойға келетініңізді растаңыз', rsvp: RSVP3, wishes: true, wishesTitle: 'Ізгі тілектер', footer: 'Сіздерді асыға күтеміз!', music: KIDS_MUSIC },
  { id: 9002, slug: 'as', category: 'as_beru', kicker: 'АС БЕРУ', height: 4000, marker: 'circle', calm: true,
    palette: { bg: '#f2f0eb', card: '#fbfaf7', line: '#d6d0c2', ink: '#2b2f33', name: '#2b2f33', accent: '#7a6844', soft: '#e3ded2', button: '#3a4046', buttonText: '#f2ede1' },
    envelope: ['#2f3439', '#e9e1cc'], motif: (P) => shanyrak(P.ink, P.accent), motifW: 230, motifH: 230,
    y: { kicker: 410, title: 470, name: 570 }, greeting: 'Құрметті ағайын-туыс, құда-жекжат, дос-жаран!', dateTitle: 'Ас беру күні', hostsTitle: 'Ас иелері',
    timer: null, rsvpTitle: 'Келетініңізді растаңыз', rsvp: ['Иә, барамын', 'Өкінішке орай, келе алмаймын'], wishes: false, footer: 'Жатқан жері жайлы болсын', music: null },
  { id: 9003, slug: 'besik', category: 'besik', kicker: 'БЕСІК ТОЙ', height: 4600,
    palette: { bg: '#f4f7fb', card: '#ffffff', line: '#cfdbe9', ink: '#33465c', name: '#2f4f73', accent: '#b88a3a', soft: '#e3ecf6', button: '#3d5f86', buttonText: '#ffffff' },
    envelope: ['#4a6f97', '#ffffff'], motif: (P) => besik(P.accent, P.ink, P.soft), motifW: 250, motifH: 214,
    y: { kicker: 420, title: 480, name: 580 }, greeting: 'Құрметті ағайын-туыс, дос-жаран!', dateTitle: 'Той салтанаты', hostsTitle: 'Той иелері',
    timer: 'Тойға дейін қалды:', rsvpTitle: 'Тойға келетініңізді растаңыз', rsvp: RSVP3, wishes: true, wishesTitle: 'Ізгі тілектер', footer: 'Сіздерді асыға күтеміз!', music: KIDS_MUSIC },
  { id: 9004, slug: 'sundet', category: 'sundet', kicker: 'СҮНДЕТ ТОЙ', height: 4600,
    palette: { bg: '#f3f5f9', card: '#ffffff', line: '#cfd7e6', ink: '#1f3456', name: '#1f3a63', accent: '#b8902f', soft: '#e4e9f3', button: '#1f3a63', buttonText: '#f6e7bf' },
    envelope: ['#1f3a63', '#f0dca8'], motif: (P) => rosette(P.ink, P.accent, `<circle r="40" fill="#ffffff" stroke="${P.accent}" stroke-width="2"/><g transform="translate(-6,0)">${crescent(P.accent)}</g>`), motifW: 230, motifH: 230,
    y: { kicker: 420, title: 480, name: 580 }, greeting: 'Құрметті ағайын-туыс, дос-жаран!', dateTitle: 'Той салтанаты', hostsTitle: 'Той иелері',
    timer: 'Тойға дейін қалды:', rsvpTitle: 'Тойға келетініңізді растаңыз', rsvp: RSVP3, wishes: true, wishesTitle: 'Ізгі тілектер', footer: 'Сіздерді асыға күтеміз!', music: KIDS_MUSIC },
];

const cards = [];
for (const s of SPECS) {
  const P = s.palette;
  write(`media/${s.slug}-band.svg`, band(P.accent, P.ink));
  write(`media/${s.slug}-rosette.svg`, rosette(P.accent, P.ink));
  write(`media/${s.slug}-divider.svg`, divider(P.accent, P.ink));
  write(`media/${s.slug}-corner.svg`, corner(P.accent));
  write(`media/${s.slug}-motif.svg`, s.motif(P));
  const tpl = template(s);
  write(`templates/${s.id}.json`, JSON.stringify(tpl, null, 1) + '\n');
  cards.push({ id: s.id, category: s.category, lang: 'kz', popularity: 100, own: true });
  console.log(`#${s.id} ${s.category}: ${tpl.blocks[0].components.length} элементов, высота ${tpl.blocks[0].style.height}`);
}
write('catalog.json', JSON.stringify(cards, null, 1) + '\n');
