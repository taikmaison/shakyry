// Раскладка «sage» (қыз ұзату и др.): фото во всю ширину сверху, на нём шалфейный круг с датой и именем,
// веточка цветов, название; шалфейная полоса с отсчётом; текст и натюрморт; календарь; место — на шалфейной полосе
// с рисунком зала; той иелері, анкета, пожелания, низ с веточкой.
// Картинки — own/media/<slug>-hero.jpg (фото), <slug>-stilllife.webp и <slug>-sprig.webp (фон вырезан).
const O = require('./ornaments');
const { SERIF, SANS, RSVP3 } = require('./layouts');

const SCRIPT = '"KZGoodVibes", "Great Vibes", cursive';   // рукописный шрифт сайта (fonts.css)

// тонкий разделитель: две линии, ромб и листики
const leafDivider = (c, c2) => O.svg(240, 30, `
<line x1="14" y1="15" x2="92" y2="15" stroke="${c}" stroke-width="1"/><line x1="148" y1="15" x2="226" y2="15" stroke="${c}" stroke-width="1"/>
<path d="M104,15 C108,8 114,6 118,6 C116,11 111,14 104,15 Z" fill="${c}"/><path d="M136,15 C132,8 126,6 122,6 C124,11 129,14 136,15 Z" fill="${c}"/>
<path d="M120,9 L125,15 L120,21 L115,15 Z" fill="${c2}"/>`);

// здание-дворец тонкой линией (свой рисунок): купол, колонны, крылья, ступени
function hall(c) {
  const col = x => `<line x1="${x}" y1="70" x2="${x}" y2="112" stroke="${c}" stroke-width="1.6"/>`;
  const win = (x, y) => `<path d="M${x - 7},${y + 14} L${x - 7},${y + 4} C${x - 7},${y - 2} ${x + 7},${y - 2} ${x + 7},${y + 4} L${x + 7},${y + 14} Z" fill="none" stroke="${c}" stroke-width="1.2"/>`;
  return O.svg(300, 130, `<g fill="none" stroke="${c}" stroke-linecap="round" stroke-linejoin="round">
<path d="M150,6 L150,16" stroke-width="1.4"/><circle cx="150" cy="5" r="2" fill="${c}"/>
<path d="M126,46 C126,26 174,26 174,46" stroke-width="1.6"/><path d="M134,46 C134,32 166,32 166,46" stroke-width="1"/>
<path d="M120,46 L180,46 L180,54 L120,54 Z" stroke-width="1.4"/>
<path d="M104,70 L150,56 L196,70 Z" stroke-width="1.6"/><circle cx="150" cy="64" r="3.2" stroke-width="1.1"/>
<line x1="98" y1="70" x2="202" y2="70" stroke-width="1.6"/>
${[110, 130, 150, 170, 190].map(col).join('')}
<path d="M28,78 L98,78 M202,78 L272,78" stroke-width="1.4"/><path d="M28,78 L28,112 M272,78 L272,112" stroke-width="1.4"/>
<path d="M22,78 L98,72 M278,78 L202,72" stroke-width="1"/>
${[44, 66, 88].map(x => win(x, 88)).join('')}${[212, 234, 256].map(x => win(x, 88)).join('')}
<path d="M140,112 L140,92 C140,84 160,84 160,92 L160,112" stroke-width="1.3"/>
<line x1="14" y1="112" x2="286" y2="112" stroke-width="1.8"/><line x1="96" y1="118" x2="204" y2="118" stroke-width="1.2"/><line x1="84" y1="124" x2="216" y2="124" stroke-width="1"/>
</g>`);
}

function buildSage(spec) {
  const P = spec.palette, M = `/media/own/${spec.slug}-`;
  const media = {};
  const file = (name, svgText) => { media[`${spec.slug}-${name}`] = svgText; return M + name; };
  const divider = file('divider.svg', leafDivider(P.accent, P.rose));
  const dividerLight = file('divider-light.svg', leafDivider('#ffffff', P.roseLight));
  const building = file('hall.svg', hall('#ffffff'));

  let n = 0, z = 100;
  const comps = [];
  const anim = (type, d = 1.6) => ({ type, duration: d, isInfinite: false, motionPath: null });
  const add = (type, y, w, h, style, data, x = 50) => { const c = { id: `own${spec.id}_${++n}`, type, position: { x, y, z: ++z }, size: { width: w, height: h }, style, data }; comps.push(c); return c; };
  const text = (y, content, o = {}) => add('text', y, o.w || 340, o.h || 60, {
    fontSize: (o.size || 18) + 'px', fontFamily: o.font || SANS, color: o.color || P.ink, textAlign: 'center', fontWeight: String(o.weight || 400),
    lineHeight: String(o.lh || 1.4), ...(o.italic ? { fontStyle: 'italic' } : {}), ...(o.ls ? { letterSpacing: o.ls } : {}), ...(o.upper ? { textTransform: 'uppercase' } : {}),
  }, { content, tag: 'p', ...(o.fit ? { __fit: true } : {}), __animation: anim(o.anim || 'fadeIn', o.dur || 1.6) });
  const image = (y, src, w, h, o = {}) => add('image', y, w, h, { borderRadius: o.radius || '0px', objectFit: o.fit || 'contain', ...(o.rot ? { transform: `rotate(${o.rot}deg)` } : {}) },
    { src, isPhoto: !!o.photo, __animation: o.animObj || anim(o.anim || 'fadeIn', o.dur || 1.8) }, o.x);
  const shape = (y, w, h, style) => add('shape', y, w, h, style, { shapeType: 'rectangle' });
  const heading = (y, s, color = P.ink) => text(y, s, { font: SERIF, size: 30, weight: 500, h: 70, w: 360, color, fit: true, anim: 'slideInUp' });
  const W = '#ffffff', FULL = 432;

  // ---------- шапка: фото, веточка (под кругом), круг с датой и именем, название ----------
  // во всю ширину — 432: холст до 430 px, у компонента прозрачная рамка 1 px; лишнее обрезает холст
  image(270, M + 'hero.jpg', FULL, 540, { fit: 'cover', photo: true, anim: 'fadeIn', dur: 1.4 });
  image(612, M + 'sprig.webp', 220, 220, { x: 19, animObj: { type: 'float', duration: 5, isInfinite: true, motionPath: null } });
  shape(520, 250, 250, { backgroundColor: P.band, borderRadius: '50%',
    boxShadow: `0 14px 34px rgba(60, 50, 30, .28), inset 0 0 0 7px ${P.band}, inset 0 0 0 8.5px rgba(255, 255, 255, .75)` });
  text(452, 'DATE', { size: 12, weight: 600, ls: '0.3em', color: W, h: 24, w: 200 });
  // без масштабной анимации: уменьшение шрифта под рамку меряет строки без transform
  text(512, 'ИМЯ', { font: SCRIPT, size: 54, color: W, h: 90, w: 214, lh: 1.1, fit: true, anim: 'fadeIn', dur: 1.8 });
  if (spec.circleLabel) text(568, spec.circleLabel, { size: 12, weight: 600, ls: '0.28em', upper: true, color: W, h: 24, w: 200 });
  text(712, 'TITLE', { font: SERIF, size: 28, weight: 500, h: 84, w: 330, fit: true, anim: 'slideInUp' });

  // ---------- отсчёт на шалфейной полосе ----------
  const timer = spec.timer === undefined ? 'Тойға дейін қалды:' : spec.timer;
  let y = 790;
  if (timer) {
    shape(y + 90, FULL, 180, { backgroundColor: P.band });
    add('timer', y + 90, 330, 150, {}, { event_date: '2027-06-12T13:00:00.000Z', event_title: timer, timezone: 'Asia/Almaty', show_days: true, show_hours: true,
      show_minutes: true, show_seconds: true, timerLanguage: 'kz', backgroundColor: 'transparent', borderRadius: 8, titleFontSize: 14, titleFontFamily: 'OwnMontserrat',
      titleColor: W, numbersFontSize: 30, numbersFontFamily: 'OwnMontserrat', numbersColor: W, labelsFontSize: 12, labelsFontFamily: 'OwnMontserrat',
      labelsColor: W, showLabels: true, spacing: 14, __animation: anim('fadeIn', 1.6) });
    y += 180;
  }

  // ---------- приветствие, текст, натюрморт ----------
  image(y + 50, divider, 240, 30);
  text(y + 112, spec.greeting || 'Құрметті ағайын-туыс,\nқұда-жекжат, дос-жаран!', { font: SERIF, size: 26, weight: 500, italic: true, h: 80, w: 330 });
  text(y + 280, 'INVITE_TEXT', { size: 17, lh: 1.6, h: 230, w: 320, fit: true });
  image(y + 540, M + 'stilllife.webp', 300, 300, { anim: 'zoomIn', dur: 1.8 });
  y += 710;

  // ---------- дата ----------
  heading(y, spec.dateTitle || 'Той салтанаты');
  add('calendar', y + 280, 300, 470, {}, { backgroundColor: 'transparent', borderRadius: 8, titleFontSize: 16, titleFontFamily: 'OwnMontserrat', titleColor: P.ink,
    calendarLanguage: 'kz', event_dates: [{ date: '2027-06-12', time: '18:00', title: null, description: null }], padding: 20, titleText: '',
    weekdaysFontSize: 12, weekdaysFontFamily: 'OwnMontserrat', weekdaysColor: P.accentText, daysFontSize: 15, daysFontFamily: 'OwnMontserrat', daysColor: P.ink,
    eventMarkerType: spec.marker || 'heart', eventMarkerColor: P.roseText, eventMarkerSize: 28, __animation: anim('fadeIn', 1.8) });
  y += 600;

  // ---------- место: шалфейная полоса с рисунком зала ----------
  shape(y + 260, FULL, 520, { backgroundColor: P.band });
  image(y + 95, building, 300, 130, { anim: 'fadeIn', dur: 2 });
  text(y + 205, spec.placeTitle || 'Мекенжайы', { font: SERIF, size: 30, weight: 500, h: 60, w: 340, color: W, anim: 'slideInUp' });
  text(y + 262, 'CITY', { size: 14, weight: 600, ls: '0.24em', upper: true, color: W, h: 36, fit: true });
  text(y + 330, 'ADDRESS', { size: 18, lh: 1.5, h: 90, w: 320, fit: true, color: W });
  add('button', y + 425, 210, 50, {}, { backgroundColor: P.card, borderRadius: 25, text: 'Картаны ашу', url: 'https://example.com', textColor: P.accentText, shadowStyle: 'none',
    borderColor: P.card, borderWidth: 0, openInNewTab: true, fontSize: 15, fontFamily: 'OwnMontserrat', fontWeight: 600, __animation: anim('zoomIn', 1.4) });
  image(y + 490, dividerLight, 240, 30);
  y += 590;

  // ---------- той иелері ----------
  image(y, divider, 240, 30);
  heading(y + 62, spec.hostsTitle || 'Той иелері');
  text(y + 132, 'HOST', { font: SERIF, size: 24, weight: 500, italic: true, h: 90, w: 340, fit: true });
  y += 220;

  // ---------- анкета ----------
  const rsvp = spec.rsvp || RSVP3;
  image(y, divider, 240, 30);
  heading(y + 66, spec.rsvpTitle || 'Тойға келетініңізді растаңыз');
  add('form2', y + 320, 380, 400, {}, { form_id: `form2_own${spec.id}`, form_fields: [{ id: '1', field_type: 'text', field_label: 'Есіміңіз', placeholder: 'Аты-жөніңіз', is_required: true, field_name: 'field_1' }],
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
    image(y, divider, 240, 30);
    heading(y + 62, spec.wishesTitle || 'Ізгі тілектер');
    add('wishes-list', y + 290, 400, 380, {}, { form_lang: 'kz', button_text: 'БАРЛЫҚ ТІЛЕКТЕРДІ ОҚУ', title_color: P.ink, card_bg_color: '#ffffff',
      button_color: P.accentText, font_family: 'OwnMontserrat', auto_scroll_interval: 3500, __animation: anim('fadeIn', 1.6) });
    y += 460;
  }

  // ---------- низ ----------
  image(y + 110, M + 'sprig.webp', 220, 220, { rot: -90, anim: 'zoomIn', dur: 2 });
  text(y + 250, spec.footer || 'Сіздерді асыға күтеміз!', { font: SERIF, size: 26, weight: 500, italic: true, h: 80, w: 340 });
  image(y + 320, divider, 240, 30);
  const music = spec.music === undefined ? null : spec.music;
  const height = y + 370 + (music || wishes ? 76 : 0);

  if (music) add('audio-fixed', 0, 200, 80, {}, { audio_url: music, button_text: 'Әуен қосу', button_color: P.button, text_color: P.buttonText, font_family: 'OwnMontserrat', font_size: 16, button_height: 52 });
  if (wishes) add('fixed-wishes', 0, 200, 80, {}, { button_text: 'ТІЛЕК ЖАЗУ', button_color: P.button, text_color: P.buttonText, font_family: 'OwnMontserrat', font_size: 16, button_height: 52, component_language: 'kz' });

  for (const c of comps) c.position.y = +(c.position.y / height * 100).toFixed(4);
  return {
    media,
    tpl: {
      id: spec.id, category: spec.category, lang: 'kz', updated_at: '2026-11-01T00:00:00', own: true,
      envelope: { theme: spec.envelopeTheme || 'soft_pink', lang: 'kz', color: spec.envelope[0], text_color: spec.envelope[1], background: null, button_image: null },
      blocks: [{ type: 'canvas', style: { backgroundColor: P.bg, backgroundImage: '', minHeight: '500px', height: height + 'px', margin: '0px', padding: '20px', borderRadius: '0px', border: 'none', boxShadow: 'none' }, components: comps }],
    },
  };
}

module.exports = { buildSage };
