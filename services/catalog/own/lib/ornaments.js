// Библиотека казахских орнаментов (SVG, рисуем сами). Все функции возвращают строку SVG-разметки.
// Цвета передаются явно: c — основной цвет линий, c2 — второй (акцент/точки).

const svg = (w, h, body, vb = `0 0 ${w} ${h}`) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${vb}">${body}</svg>\n`;

// ---------- элементы ----------
// қошқар мүйіз (бараний рог): стебель снизу, рог закручивается наружу и внутрь; левая половина — зеркало
const HORN = 'M0,46 C0,22 4,6 18,-4 C34,-15 56,-10 60,6 C64,22 50,34 37,29 C26,25 27,10 38,10 C45,10 47,18 42,21';
const horn = (c, sw = 5) => `<g fill="none" stroke="${c}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><path d="${HORN}"/><path d="${HORN}" transform="scale(-1,1)"/></g>`;
// сыңар мүйіз: один рог (правая половина)
const halfHorn = (c, sw = 5) => `<path d="${HORN}" fill="none" stroke="${c}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`;
const diamond = (c, s = 7) => `<path d="M0,${-s} L${s * .8},0 L0,${s} L${-s * .8},0 Z" fill="${c}"/>`;
// тұмар — треугольный оберег
// тұмар: треугольный оберег — контур и залитый треугольник внутри (с точкой в центре он читался как «глаз в треугольнике»)
const tumar = (c, s = 10) => `<path d="M0,${-s} L${s * .9},${s * .6} L${-s * .9},${s * .6} Z" fill="none" stroke="${c}" stroke-width="${Math.max(1.2, s / 6)}" stroke-linejoin="round"/><path d="M0,${-s * .38} L${s * .4},${s * .3} L${-s * .4},${s * .3} Z" fill="${c}"/>`;
const star = (c, r = 8, n = 4) => {
  const pts = [];
  for (let i = 0; i < n * 2; i++) { const a = Math.PI * i / n - Math.PI / 2, rr = i % 2 ? r * .32 : r; pts.push(`${(Math.cos(a) * rr).toFixed(2)},${(Math.sin(a) * rr).toFixed(2)}`); }
  return `<path d="M${pts.join(' L')} Z" fill="${c}"/>`;
};
// месяц со звездой (центр около 0,0)
const crescent = c => `<path d="M8,-26 a28,28 0 1,0 0,52 a22,22 0 1,1 0,-52 Z" fill="${c}"/><g transform="translate(18,3)">${star(c, 8, 5)}</g>`;
// лепесток
const petal = (c, rx = 7, ry = 17) => `<ellipse rx="${rx}" ry="${ry}" fill="${c}"/>`;

// ---------- полосы (верх и низ страницы, 430×72) ----------
const bands = {
  horn(c, c2) {
    let s = `<line x1="6" y1="8" x2="424" y2="8" stroke="${c}" stroke-width="1.6"/><line x1="6" y1="64" x2="424" y2="64" stroke="${c}" stroke-width="1.6"/>`;
    for (let i = 0; i < 6; i++) {
      const x = 35 + i * 72;
      s += `<g transform="translate(${x},38) scale(.42)">${horn(c, 7)}</g><g transform="translate(${x},55)">${diamond(c2, 4)}</g>`;
      if (i < 5) s += `<g transform="translate(${x + 36},36)">${diamond(c2, 3.5)}</g>`;
    }
    return svg(430, 72, s);
  },
  // цепочка ромбов с точками
  diamond(c, c2) {
    let s = `<line x1="6" y1="12" x2="424" y2="12" stroke="${c}" stroke-width="1.4"/><line x1="6" y1="60" x2="424" y2="60" stroke="${c}" stroke-width="1.4"/>`;
    for (let i = 0; i < 12; i++) {
      const x = 22 + i * 35.1;
      s += `<path d="M${x},22 L${x + 13},36 L${x},50 L${x - 13},36 Z" fill="none" stroke="${c}" stroke-width="2"/><g transform="translate(${x},36)">${diamond(c2, 4)}</g>`;
      if (i < 11) s += `<circle cx="${x + 17.5}" cy="36" r="2.2" fill="${c2}"/>`;
    }
    return svg(430, 72, s);
  },
  // ирек — бегущая волна-завиток
  wave(c, c2) {
    let d = 'M0,40';
    for (let x = 0; x < 430; x += 40) d += ` C${x + 10},16 ${x + 30},16 ${x + 30},32 C${x + 30},42 ${x + 20},44 ${x + 18},36 C${x + 16},30 ${x + 26},28 ${x + 26},36 M${x + 30},32 C${x + 30},48 ${x + 40},52 ${x + 40},40`;
    return svg(430, 72, `<line x1="4" y1="8" x2="426" y2="8" stroke="${c}" stroke-width="1.4"/><line x1="4" y1="64" x2="426" y2="64" stroke="${c}" stroke-width="1.4"/><path d="${d}" fill="none" stroke="${c}" stroke-width="2.6" stroke-linecap="round"/>${Array.from({ length: 11 }, (_, i) => `<circle cx="${20 + i * 40}" cy="56" r="2.2" fill="${c2}"/>`).join('')}`);
  },
  // ряд тұмаров
  tumar(c, c2) {
    let s = `<line x1="6" y1="10" x2="424" y2="10" stroke="${c}" stroke-width="1.4"/><line x1="6" y1="62" x2="424" y2="62" stroke="${c}" stroke-width="1.4"/>`;
    for (let i = 0; i < 9; i++) { const x = 24 + i * 47.75; s += `<g transform="translate(${x},38)">${tumar(c, 13)}</g>`; if (i < 8) s += `<g transform="translate(${x + 24},36)">${diamond(c2, 3.5)}</g>`; }
    return svg(430, 72, s);
  },
};

// ---------- разделители (260×46) ----------
const dividers = {
  horn: (c, c2) => svg(260, 46, `<line x1="10" y1="26" x2="98" y2="26" stroke="${c}" stroke-width="1.4"/><line x1="162" y1="26" x2="250" y2="26" stroke="${c}" stroke-width="1.4"/>
<g transform="translate(130,24) scale(.4)">${horn(c, 7)}</g><g transform="translate(130,40)">${diamond(c2, 4)}</g><circle cx="104" cy="26" r="2.5" fill="${c2}"/><circle cx="156" cy="26" r="2.5" fill="${c2}"/>`),
  diamond: (c, c2) => svg(260, 46, `<line x1="10" y1="23" x2="100" y2="23" stroke="${c}" stroke-width="1.4"/><line x1="160" y1="23" x2="250" y2="23" stroke="${c}" stroke-width="1.4"/>
<g transform="translate(130,23)"><path d="M0,-16 L14,0 L0,16 L-14,0 Z" fill="none" stroke="${c}" stroke-width="2"/>${diamond(c2, 6)}</g><g transform="translate(110,23)">${diamond(c, 4)}</g><g transform="translate(150,23)">${diamond(c, 4)}</g>`),
  wave: (c, c2) => svg(260, 46, `<path d="M10,23 C40,8 60,38 90,23 S130,8 130,23 S170,38 170,23 S220,8 250,23" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round"/><g transform="translate(130,23)">${diamond(c2, 5)}</g>`),
  tumar: (c, c2) => svg(260, 46, `<line x1="10" y1="26" x2="104" y2="26" stroke="${c}" stroke-width="1.4"/><line x1="156" y1="26" x2="250" y2="26" stroke="${c}" stroke-width="1.4"/><g transform="translate(130,24)">${tumar(c, 15)}</g><g transform="translate(112,26)">${diamond(c2, 3.5)}</g><g transform="translate(148,26)">${diamond(c2, 3.5)}</g>`),
};

// ---------- розетки (260×260; inner — свой центр) ----------
const rosettes = {
  horn8(c, c2, inner = '') {
    let s = `<g transform="translate(130,130)"><circle r="122" fill="none" stroke="${c}" stroke-width="2.4"/><circle r="113" fill="none" stroke="${c}" stroke-width="1"/>`;
    // 6 рогов (имя ключа «horn8» оставлено — на него ссылаются описания): при 8 соседние завитки сплетались в узлы
    const r = inner ? 94 : 74, k0 = inner ? .42 : .56;
    for (let k = 0; k < 6; k++) s += `<g transform="rotate(${k * 60}) translate(0,-${r}) scale(${k0})">${horn(c, 6)}</g><g transform="rotate(${k * 60 + 30}) translate(0,-100)">${diamond(c2, 5)}</g>`;
    // центр — восьмилепестковый цветок (четыре тёмных лепестка читались как крест)
    s += inner || `<circle r="30" fill="none" stroke="${c}" stroke-width="2"/>${[0, 45, 90, 135, 180, 225, 270, 315].map(a => `<g transform="rotate(${a}) translate(0,-14)">${petal(c, 4.5, 10)}</g>`).join('')}<circle r="5.5" fill="${c2}"/>`;
    return svg(260, 260, s + '</g>');
  },
  // восьмиконечная звезда из двух квадратов с рогами по углам
  star8(c, c2, inner = '') {
    let s = `<g transform="translate(130,130)"><circle r="122" fill="none" stroke="${c}" stroke-width="1.6"/>`;
    s += `<rect x="-74" y="-74" width="148" height="148" fill="none" stroke="${c}" stroke-width="2.4"/><rect x="-74" y="-74" width="148" height="148" fill="none" stroke="${c}" stroke-width="2.4" transform="rotate(45)"/>`;
    for (let k = 0; k < 8; k++) s += `<g transform="rotate(${k * 45}) translate(0,-104) scale(.3)">${horn(c2, 8)}</g>`;
    s += inner || `<circle r="40" fill="none" stroke="${c2}" stroke-width="2"/>${[0, 60, 120, 180, 240, 300].map(a => `<g transform="rotate(${a}) translate(0,-20)">${petal(c, 6, 14)}</g>`).join('')}<circle r="6" fill="${c2}"/>`;
    return svg(260, 260, s + '</g>');
  },
  // цветок: 12 лепестков в два ряда
  flower(c, c2, inner = '') {
    let s = `<g transform="translate(130,130)"><circle r="122" fill="none" stroke="${c}" stroke-width="1.6"/><circle r="116" fill="none" stroke="${c2}" stroke-width="1" stroke-dasharray="3 6"/>`;
    for (let k = 0; k < 12; k++) s += `<g transform="rotate(${k * 30}) translate(0,-78)"><ellipse rx="13" ry="30" fill="none" stroke="${c}" stroke-width="2"/></g><g transform="rotate(${k * 30 + 15}) translate(0,-96)">${diamond(c2, 4)}</g>`;
    s += inner || `<circle r="38" fill="none" stroke="${c}" stroke-width="2"/>${[0, 45, 90, 135, 180, 225, 270, 315].map(a => `<g transform="rotate(${a}) translate(0,-18)">${petal(c2, 5, 11)}</g>`).join('')}<circle r="5" fill="${c}"/>`;
    return svg(260, 260, s + '</g>');
  },
};

// гребень рамки (84×40): ставится по центру верхней/нижней линии рамки и «разрывает» её фоном bg
const corner = (c, bg = 'none') => svg(84, 40, `<rect x="4" y="19" width="76" height="11" fill="${bg}"/><g transform="translate(42,17) scale(.36)">${horn(c, 7)}</g><g transform="translate(42,33)">${diamond(c, 3.2)}</g><circle cx="12" cy="20" r="2" fill="${c}"/><circle cx="72" cy="20" r="2" fill="${c}"/>`);

// арка (360×480): стрельчатый свод из двойной линии, рога на вершине, колонны с ромбами
function arch(c, c2, fill = 'none') {
  const outer = 'M30,470 L30,190 C30,110 110,52 180,30 C250,52 330,110 330,190 L330,470';
  const inner = 'M46,470 L46,196 C46,124 118,72 180,50 C242,72 314,124 314,196 L314,470';
  let s = `<path d="${inner} Z" fill="${fill}" stroke="none"/><path d="${outer}" fill="none" stroke="${c}" stroke-width="3"/><path d="${inner}" fill="none" stroke="${c}" stroke-width="1.4"/>`;
  s += `<g transform="translate(180,18) scale(.5)">${horn(c, 7)}</g>`;
  for (let y = 230; y < 460; y += 46) s += `<g transform="translate(38,${y})">${diamond(c2, 4)}</g><g transform="translate(322,${y})">${diamond(c2, 4)}</g>`;
  s += `<g transform="translate(70,150) rotate(-38) scale(.3)">${horn(c2, 8)}</g><g transform="translate(290,150) rotate(38) scale(.3)">${horn(c2, 8)}</g>`;
  // двойной цоколь внизу — арка не обрывается
  s += `<path d="M20,470 L340,470" stroke="${c}" stroke-width="3" stroke-linecap="round"/><path d="M30,477 L330,477" stroke="${c}" stroke-width="1.4" stroke-linecap="round"/>`;
  return svg(360, 480, s);
}

// боковая полоса во всю высоту страницы (26×h): узор повторяется
function side(c, c2, h) {
  return svg(26, h, `<defs><pattern id="p" width="26" height="60" patternUnits="userSpaceOnUse"><g transform="translate(13,30) scale(.22)">${horn(c, 8)}</g><g transform="translate(13,56)">${diamond(c2, 3)}</g></pattern></defs>
<line x1="3" y1="0" x2="3" y2="${h}" stroke="${c}" stroke-width="1.2"/><line x1="23" y1="0" x2="23" y2="${h}" stroke="${c}" stroke-width="1.2"/><rect x="0" y="0" width="26" height="${h}" fill="url(#p)"/>`);
}

// гравюра гор (Алатау шыңдары), киіз үйлер және даладағы жылқылар
function mountains(c, w = 360, h = 130) {
  let s = `<defs>
<style>
.m-stroke { stroke: ${c}; fill: none; stroke-linecap: round; stroke-linejoin: round; }
.m-fill { fill: ${c}; }
.m-hatch { stroke: ${c}; stroke-width: 0.75; opacity: 0.65; }
</style>
</defs>
<path class="m-stroke" stroke-width="1.2" opacity="0.45" d="M0,68 L40,40 L85,58 L135,26 L190,54 L250,22 L300,50 L340,34 L360,44"/>
<path class="m-hatch" d="M135,26 L148,50 M138,30 L151,52 M250,22 L263,46 M253,26 L266,48"/>
<path class="m-stroke" stroke-width="2" d="M0,86 L28,72 L64,38 L104,70 L144,32 L172,56 L220,16 L260,52 L292,28 L328,64 L360,46"/>
<path class="m-stroke" stroke-width="1.2" d="M64,38 L73,70"/>
<path class="m-hatch" d="M66,44 L80,62 M68,50 L84,65 M70,56 L88,68"/>
<path class="m-stroke" stroke-width="1.4" d="M144,32 L157,63"/>
<path class="m-hatch" d="M146,38 L162,56 M148,44 L165,59 M150,50 L168,62"/>
<path class="m-stroke" stroke-width="1.6" d="M220,16 L235,54"/>
<path class="m-hatch" d="M222,22 L242,45 M224,28 L246,48 M226,34 L249,51 M228,40 L252,54"/>
<path class="m-stroke" stroke-width="1.3" d="M292,28 L305,58"/>
<path class="m-hatch" d="M294,34 L310,52 M296,40 L313,55 M298,46 L316,58"/>
<path class="m-stroke" stroke-width="1.5" d="M0,95 Q54,83 117,92 Q180,101 252,88 Q306,81 360,94"/>
<path class="m-stroke" stroke-width="1" opacity="0.7" d="M9,106 Q81,97 162,103 Q243,110 351,101"/>
<g transform="translate(38, 96)">
  <path class="m-stroke" stroke-width="1.4" d="M-16,11 L-16,3 Q-16,-4 0,-8 Q16,-4 16,3 L16,11 Z"/>
  <ellipse cx="0" cy="-8" rx="3" ry="1" class="m-stroke" stroke-width="1"/>
  <rect x="-2.5" y="2" width="5" height="9" class="m-stroke" stroke-width="1.1"/>
  <path class="m-stroke" stroke-width="0.8" d="M-16,3 Q0,-3 16,3 M-16,7 Q0,1 16,7"/>
</g>
<g transform="translate(296, 92)">
  <path class="m-stroke" stroke-width="1.4" d="M-13,9 L-13,2 Q-13,-4 0,-7 Q13,-4 13,2 L13,9 Z"/>
  <ellipse cx="0" cy="-7" rx="2.6" ry="0.9" class="m-stroke" stroke-width="0.9"/>
  <rect x="-2.2" y="2" width="4.4" height="7" class="m-stroke" stroke-width="1"/>
  <path class="m-stroke" stroke-width="0.8" d="M-13,2 Q0,-3 13,2"/>
</g>
<g transform="translate(166, 104) scale(0.65)">
  <path class="m-fill" d="M0,0 C2,-3 5,-4 8,-3 C12,-1 14,-5 16,-8 C17,-6 18,-4 16,-2 C18,-1 19,1 17,3 C15,4 13,3 12,4 L13,10 L11,10 L10,5 L7,5 L7,10 L5,10 L5,4 C3,4 1,5 0,0 Z"/>
</g>
<g transform="translate(184, 106) scale(0.5)">
  <path class="m-fill" d="M0,0 C2,-3 5,-4 8,-3 C12,-1 14,-5 16,-8 C17,-6 18,-4 16,-2 C18,-1 19,1 17,3 C15,4 13,3 12,4 L13,10 L11,10 L10,5 L7,5 L7,10 L5,10 L5,4 C3,4 1,5 0,0 Z"/>
</g>
<g transform="translate(100, 106) scale(0.55)">
  <path class="m-fill" d="M16,2 C13,0 10,-2 6,-2 C4,-1 2,2 0,4 C-2,6 -4,8 -3,9 C-1,9 1,7 3,5 L5,5 L4,10 L6,10 L7,5 L11,5 L12,10 L14,10 L13,4 C15,4 17,3 16,2 Z"/>
</g>
<line x1="8" y1="122" x2="352" y2="122" class="m-stroke" stroke-width="1.2"/>
<line x1="18" y1="125" x2="342" y2="125" class="m-stroke" stroke-width="0.8" opacity="0.6"/>`;
  return svg(w, h, s);
}

module.exports = { svg, HORN, horn, halfHorn, diamond, tumar, star, crescent, petal, bands, dividers, rosettes, corner, arch, side, mountains };

