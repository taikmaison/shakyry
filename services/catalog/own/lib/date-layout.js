// Раскладка «приглашение на свидание» (layout: 'date'): один гость, дату выбирает он сам (анкета с календарём),
// время и место — из формы. Обложка вместо конверта — картинка во весь экран (envelope.style = 'cover').
//   шапка: «приглашение на свидание», «Дорогая», ИМЯ, сердце на нити, INVITE_TEXT, фото
//   выбор даты (form3, вопрос type 'date') → время (FULL_TIME) → место (ADDRESS, CITY, кнопка 2GIS) → дресс-код → подпись (HOST)
// Тексты — в описании шаблона (spec.text), картинки — own/media/<slug>-*.jpg (свои, сгенерированные).
const O = require('./ornaments');
const { SERIF, SANS } = require('./layouts');

const SCRIPT = '"KZGoodVibes", "Great Vibes", cursive';   // рукописный шрифт сайта (fonts.css), им же подписан конверт
const WALTZ = '/media/59/1280ec9b389e67.mp3';   // «Шопен — Весенний вальс» из музыки сайта: нежно и без слов

// нить через всю ширину с сердцем-печатью посередине (рисуем сами)
const heartThread = (c, c2) => O.svg(390, 90, `
<path d="M0,58 C70,30 120,74 168,50" fill="none" stroke="${c}" stroke-width="1.6" stroke-linecap="round"/>
<path d="M222,50 C270,26 320,72 390,40" fill="none" stroke="${c}" stroke-width="1.6" stroke-linecap="round"/>
<g transform="translate(195,48)">
  <path d="M0,22 C-14,12 -26,3 -26,-9 C-26,-18 -19,-24 -11,-24 C-6,-24 -2,-21 0,-16 C2,-21 6,-24 11,-24 C19,-24 26,-18 26,-9 C26,3 14,12 0,22 Z" fill="${c}"/>
  <path d="M0,15 C-9,8 -18,2 -18,-7 C-18,-13 -13,-17 -8,-17 C-4,-17 -1,-14 0,-11 C1,-14 4,-17 8,-17 C13,-17 18,-13 18,-7 C18,2 9,8 0,15 Z" fill="none" stroke="${c2}" stroke-width="1.2" opacity=".7"/>
  <path d="M-12,-12 C-9,-16 -4,-16 -2,-12" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity=".35"/>
</g>`);
// тонкий разделитель с маленьким сердцем
const smallDivider = (c, c2) => O.svg(260, 30, `
<line x1="16" y1="15" x2="112" y2="15" stroke="${c2}" stroke-width="1"/><line x1="148" y1="15" x2="244" y2="15" stroke="${c2}" stroke-width="1"/>
<path d="M130,24 C122,18 115,13 115,7 C115,3 118,0 122,0 C125,0 128,2 130,5 C132,2 135,0 138,0 C142,0 145,3 145,7 C145,13 138,18 130,24 Z" fill="${c}"/>`);

function buildDate(spec) {
  const P = spec.palette, X = spec.text, M = `/media/own/${spec.slug}-`;
  const media = {};
  const file = (name, svgText) => { media[`${spec.slug}-${name}`] = svgText; return M + name; };
  const thread = file('heart.svg', heartThread(P.accent, P.gold));
  const divider = file('divider.svg', smallDivider(P.accent, P.gold));

  let n = 0, z = 100;
  const comps = [];
  const anim = (type, d = 1.6) => ({ type, duration: d, isInfinite: false, motionPath: null });
  const add = (type, y, w, h, style, data, x = 50) => { const c = { id: `own${spec.id}_${++n}`, type, position: { x, y, z: ++z }, size: { width: w, height: h }, style, data }; comps.push(c); return c; };
  const text = (y, content, o = {}) => add('text', y, o.w || 340, o.h || 60, {
    fontSize: (o.size || 18) + 'px', fontFamily: o.font || SANS, color: o.color || P.ink, textAlign: 'center', fontWeight: String(o.weight || 400),
    lineHeight: String(o.lh || 1.4), ...(o.italic ? { fontStyle: 'italic' } : {}), ...(o.ls ? { letterSpacing: o.ls } : {}), ...(o.upper ? { textTransform: 'uppercase' } : {}),
  }, { content, tag: 'p', ...(o.fit ? { __fit: true } : {}), __animation: anim(o.anim || 'fadeIn', o.dur || 1.6) });
  const image = (y, src, w, h, o = {}) => add('image', y, w, h, { borderRadius: o.radius || '0px', objectFit: o.cover ? 'cover' : 'contain',
    ...(o.blend ? { mixBlendMode: o.blend } : {}), ...(o.shadow ? { boxShadow: o.shadow } : {}) }, { src, isPhoto: !!o.photo, __animation: anim(o.anim || 'fadeIn', o.dur || 1.8) });
  const script = (y, s, o = {}) => text(y, s, { font: SCRIPT, size: o.size || 46, color: o.color || P.accent, h: o.h || 76, w: o.w || 360, lh: 1.15, fit: o.fit, anim: o.anim || 'fadeIn', dur: 1.8 });
  const caps = (y, s, o = {}) => text(y, s, { size: o.size || 13, weight: 600, ls: '0.3em', upper: true, color: o.color || P.accentText || P.accent, h: o.h || 34, w: o.w || 340 });

  // ---------- шапка ----------
  caps(64, X.kicker);
  script(140, X.dear, { size: 44 });
  script(226, 'ИМЯ', { size: 76, color: P.ink, h: 110, fit: true, anim: 'zoomIn' });
  image(318, thread, 390, 90, { anim: 'fadeIn', dur: 2.2 });
  text(468, 'INVITE_TEXT', { font: SERIF, size: 21, lh: 1.5, italic: true, h: 190, w: 320, fit: true });
  image(764, `${M}photo.jpg`, 300, 360, { cover: true, photo: true, radius: '150px 150px 22px 22px', shadow: `0 18px 40px ${P.shadow}`, anim: 'zoomIn', dur: 2 });

  // ---------- выбор даты ----------
  let y = 990;
  image(y, divider, 260, 30);
  script(y + 76, X.chooseTitle, { size: 46 });
  text(y + 156, X.chooseText, { size: 15, lh: 1.6, h: 76, w: 320, color: P.ink });
  add('form3', y + 300, 340, 176, {}, {
    form_id: `form3_own${spec.id}`, formLang: 'ru', send_names: true, names_label: 'Имя', answer_action: 'yes', answer_action_text: X.answerText,
    questions: [{ type: 'date', label: '', field_name: X.dateLabel, placeholder: X.datePlaceholder, modal_title: X.modalTitle, required_text: X.dateNeeded, is_required: true, max_days: 180 }],
    done_text: X.doneText, thanks_text: X.thanksText,
    form_backgroundColor: 'transparent', form_padding: 8, mainColor: P.button, label_color: P.ink,
    field_height: 54, field_borderRadius: 27, field_borderWidth: 1.5, field_borderColor: P.line, field_backgroundColor: P.card, field_color: P.ink,
    field_fontSize: 16, field_fontFamily: 'OwnMontserrat',
    submit_button_text: X.submit, submit_button_backgroundColor: P.button, submit_button_textColor: P.buttonText, submit_button_borderRadius: 27,
    submit_button_height: 54, submit_button_fontSize: 15, submit_button_fontFamily: 'OwnMontserrat', __animation: anim('fadeIn', 1.6),
  });
  y += 430;

  // ---------- время ----------
  image(y, divider, 260, 30);
  script(y + 72, X.timeTitle, { size: 42 });
  text(y + 150, 'FULL_TIME', { font: SERIF, size: 56, weight: 500, color: P.accent, h: 76, w: 300 });
  y += 240;

  // ---------- место ----------
  image(y, divider, 260, 30);
  script(y + 72, X.placeTitle, { size: 42 });
  text(y + 156, 'ADDRESS', { font: SERIF, size: 24, weight: 500, lh: 1.35, h: 96, w: 330, fit: true });
  caps(y + 226, 'CITY', { size: 12 });
  add('button', y + 292, 230, 50, {}, { backgroundColor: P.button, borderRadius: 25, text: X.mapButton, url: 'https://example.com', textColor: P.buttonText,
    borderColor: P.button, borderWidth: 0, openInNewTab: true, fontSize: 15, fontFamily: 'OwnMontserrat', fontWeight: 600, __animation: anim('zoomIn', 1.4) });
  y += 380;

  // ---------- дресс-код ----------
  image(y, divider, 260, 30);
  script(y + 72, X.dressTitle, { size: 42 });
  caps(y + 140, X.dress, { size: 13, color: P.ink });
  text(y + 200, X.dressNote, { font: SERIF, size: 23, italic: true, color: P.accent, h: 70, w: 320 });
  y += 250;

  // ---------- подпись ----------
  image(y + 120, `${M}roses.png`, 300, 300, { anim: 'zoomIn', dur: 2 });
  script(y + 270, X.love, { size: 40 });
  script(y + 350, 'HOST', { size: 62, color: P.ink, h: 96, fit: true, anim: 'zoomIn' });
  image(y + 440, thread, 390, 90, { dur: 2.2 });
  // музыка: кнопка внизу экрана, играет после открытия обложки; песню хозяин может сменить в форме сайта
  const music = spec.music === undefined ? WALTZ : spec.music;
  const height = y + 520 + (music ? 76 : 0);
  if (music) add('audio-fixed', 0, 200, 80, {}, { audio_url: music, button_text: X.music || 'Музыка', button_color: P.button, text_color: P.buttonText,
    font_family: 'OwnMontserrat', font_size: 16, button_height: 52 });

  for (const c of comps) c.position.y = +(c.position.y / height * 100).toFixed(4);
  return {
    media,
    tpl: {
      id: spec.id, category: spec.category, lang: 'ru', updated_at: '2026-10-18T00:00:00', own: true, guest_date: true,
      envelope: { theme: 'wine_red', lang: 'ru', style: 'cover', kicker: false, color: spec.envelope[0], text_color: spec.envelope[1], background: `${M}cover.jpg`, button_image: null },
      blocks: [{ type: 'canvas', style: { backgroundColor: P.bg, backgroundImage: '', minHeight: '500px', height: height + 'px', margin: '0px', padding: '20px', borderRadius: '0px', border: 'none', boxShadow: 'none' }, components: comps }],
    },
  };
}

module.exports = { buildDate };
