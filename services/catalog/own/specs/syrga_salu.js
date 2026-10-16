// Сырға салу (құда жағы келінге сырға салады): #9021–#9024. Формат описания — own/README.md.
// Все рисунки — свои, из кода: сырғалар разных видов, шкатулка, жүзік.

const f = n => +n.toFixed(2);
// точка кубической кривой Безье
const bz = (a, b, c, d, t) => { const u = 1 - t; return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d; };
// смешать два цвета #rrggbb (t = 0 → a, 1 → b)
const mix = (a, b, t) => '#' + [1, 3, 5].map(i => Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - t) + parseInt(b.slice(i, i + 2), 16) * t).toString(16).padStart(2, '0')).join('');
// градиент металла: светлый блик сверху → цвет → тень снизу
const metalGrad = (id, c) => `<linearGradient id="${id}" x1="0" y1="0" x2=".35" y2="1"><stop offset="0" stop-color="${mix(c, '#ffffff', .45)}"/><stop offset=".5" stop-color="${c}"/><stop offset="1" stop-color="${mix(c, '#000000', .22)}"/></linearGradient>`;
// граненый камень: радиальный градиент
const gemGrad = (id, c) => `<radialGradient id="${id}" cx=".38" cy=".32" r=".75"><stop offset="0" stop-color="${mix(c, '#ffffff', .55)}"/><stop offset=".45" stop-color="${c}"/><stop offset="1" stop-color="${mix(c, '#000000', .3)}"/></radialGradient>`;
const pearlGrad = id => `<radialGradient id="${id}" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#ffffff"/><stop offset=".6" stop-color="#f6efe6"/><stop offset="1" stop-color="#d9cbbb"/></radialGradient>`;
// капля остриём вверх: верх в (0,0), низ в (0, 3r)
const drop = (r, fill, stroke = 'none', sw = 0) => `<path d="M0,0 C${f(r * .6)},${f(r * .8)} ${r},${f(r * 1.4)} ${r},${f(r * 2)} A${r},${r} 0 0,1 ${-r},${f(r * 2)} C${-r},${f(r * 1.4)} ${f(-r * .6)},${f(r * .8)} 0,0 Z" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"/>`;
// блик
const glint = (x, y, r = 1.6) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#ffffff" opacity=".85"/>`;
// цепочка из бусин от (x,y) вниз на len
const chain = (x, y, len, c, r = 1.6, step = 4.6) => { let s = ''; for (let d = 0; d <= len; d += step) s += `<circle cx="${f(x)}" cy="${f(y + d)}" r="${r}" fill="${c}"/>`; return s; };
// искорка — четырёхлучевая звезда
const spark = (O, x, y, r, c) => `<g transform="translate(${x},${y})">${O.star(c, r, 4)}</g>`;
// ушная дужка (крючок), низ в (0, 22)
const hook = (c, sw = 3) => `<path d="M0,24 L0,15 C0,1 -17,-3 -21,9 C-23,16 -19,21 -14,18" fill="none" stroke="${c}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`;

// ---------- #9021: айшық сырға — пара серёг-полумесяцев с подвесками ----------
// одна серьга, верх крючка в (0,0), высота ~172
function aishyq(m, g, p) {
  let s = hook(m);
  // верхняя розетка с зернью и камнем
  for (let k = 0; k < 10; k++) { const a = k * Math.PI / 5; s += `<circle cx="${f(Math.sin(a) * 14)}" cy="${f(36 - Math.cos(a) * 14)}" r="2.4" fill="${m}"/>`; }
  s += `<circle cy="36" r="11.5" fill="${m}"/><circle cy="36" r="6.8" fill="${g}"/>${glint(-2.2, 33.6)}`;
  s += `<path d="M0,49 L4.5,55.5 L0,62 L-4.5,55.5 Z" fill="${m}"/>`;
  // полумесяц: внешняя дуга слева направо, внутренняя обратно
  s += `<path d="M-52,62 C-44,120 44,120 52,62 C33,93 -33,93 -52,62 Z" fill="${m}"/>`;
  // зернь и камешки по средней линии
  const mid = t => [bz(-52, -38.5, 38.5, 52, t), bz(62, 106.5, 106.5, 62, t)];
  for (const t of [.13, .25, .37, .63, .75, .87]) { const [x, y] = mid(t); s += `<circle cx="${f(x)}" cy="${f(y)}" r="${t === .25 || t === .75 ? 3.4 : 2.6}" fill="${t === .25 || t === .75 ? g : p}"/>`; }
  s += `<circle cy="${f(mid(.5)[1])}" r="8" fill="${p}"/><circle cy="${f(mid(.5)[1])}" r="5.6" fill="${g}"/>${glint(-1.8, f(mid(.5)[1] - 2.2), 1.4)}`;
  s += `<circle cx="-52" cy="61" r="4.2" fill="${m}"/><circle cx="52" cy="61" r="4.2" fill="${m}"/>`;
  // подвески по нижнему краю
  const out = t => [bz(-52, -44, 44, 52, t), bz(62, 120, 120, 62, t)];
  for (const [t, len, kind] of [[.2, 18, 'm'], [.35, 32, 'p'], [.5, 46, 'g'], [.65, 32, 'p'], [.8, 18, 'm']]) {
    const [x, y] = out(t), y2 = y + len;
    s += chain(x, y + 3, len - 3, m);
    if (kind === 'g') s += `<g transform="translate(${f(x)},${f(y2)})">${drop(8, g, m, 2)}${glint(-2.6, 13)}</g>`;
    else if (kind === 'p') s += `<circle cx="${f(x)}" cy="${f(y2 + 5)}" r="5.4" fill="${p}" stroke="${m}" stroke-width="1"/>`;
    else s += `<g transform="translate(${f(x)},${f(y2)})">${drop(5, m)}</g>`;
  }
  return s;
}
function syrgaPair(P, O) {
  const defs = `<defs>${metalGrad('m', P.accent)}${gemGrad('g', P.gem)}${pearlGrad('p')}</defs>`;
  const e = aishyq('url(#m)', 'url(#g)', 'url(#p)');
  return O.svg(320, 210, `${defs}
<g transform="translate(160,30) scale(.42)">${O.horn(P.accent, 7)}</g><g transform="translate(160,48)">${O.diamond(P.name, 4)}</g>
${spark(O, 160, 104, 7, P.accent)}${spark(O, 142, 128, 4, P.name)}${spark(O, 178, 128, 4, P.name)}
<g transform="translate(78,10) rotate(-5) scale(1.12)">${e}</g><g transform="translate(242,10) rotate(5) scale(-1.12,1.12)">${e}</g>`);
}

// ---------- #9022: открытая шкатулка, на бархате крышки — пара серёг-капель ----------
function tamshy(m, g, p) {
  let s = hook(m, 2.6);
  s += `<circle cy="31" r="8.5" fill="${m}"/><circle cy="31" r="4.6" fill="${p}"/>`;
  s += `<path d="M0,40 L3.5,45 L0,50 L-3.5,45 Z" fill="${m}"/>`;
  // оправа капли с зернью и камень
  s += `<g transform="translate(0,52)">${drop(17, m)}</g><g transform="translate(0,58.5)">${drop(13, g)}${glint(-4.5, 22, 2.4)}</g>`;
  for (const [x, y] of [[-12, 76], [12, 76], [-16.6, 92], [16.6, 92], [-12, 106], [12, 106], [0, 110.5]]) s += `<circle cx="${x}" cy="${y}" r="1.9" fill="${p}"/>`;
  s += chain(0, 106, 8, m, 1.4, 4) + `<circle cy="121" r="5.2" fill="${p}" stroke="${m}" stroke-width="1"/>`;
  return s;
}
function jewelBox(P, O) {
  const a = P.accent, lt = P.ink, dk = P.soft, v = P.velvet;
  const defs = `<defs>${metalGrad('m', a)}${gemGrad('g', P.gem)}${pearlGrad('p')}<linearGradient id="v" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${mix(v, '#000000', .15)}"/><stop offset="1" stop-color="${mix(v, '#ffffff', .1)}"/></linearGradient></defs>`;
  const e = tamshy('url(#m)', 'url(#g)', 'url(#p)');
  let s = defs;
  // крышка
  s += `<path d="M40,150 L40,40 Q40,10 70,10 L210,10 Q240,10 240,40 L240,150 Z" fill="${dk}" stroke="${a}" stroke-width="3"/>`;
  s += `<path d="M53,146 L53,44 Q53,23 74,23 L206,23 Q227,23 227,44 L227,146 Z" fill="url(#v)" stroke="${a}" stroke-width="1.2"/>`;
  s += `<line x1="70" y1="36" x2="210" y2="36" stroke="${a}" stroke-width="3" stroke-linecap="round"/><circle cx="70" cy="36" r="3.5" fill="${a}"/><circle cx="210" cy="36" r="3.5" fill="${a}"/>`;
  s += `<g transform="translate(140,22) scale(.32)">${O.horn(a, 8)}</g>`;
  s += `<g transform="translate(104,30) scale(.88)">${e}</g><g transform="translate(176,30) scale(-.88,.88)">${e}</g>`;
  // ящик
  s += `<rect x="20" y="150" width="240" height="13" rx="4" fill="url(#m)"/>`;
  s += `<path d="M28,163 L252,163 L246,222 L34,222 Z" fill="${dk}" stroke="${a}" stroke-width="3" stroke-linejoin="round"/>`;
  s += `<path d="M40,172 L240,172 L235,213 L45,213 Z" fill="none" stroke="${a}" stroke-width="1.2"/>`;
  s += `<g transform="translate(140,196) scale(.5)">${O.horn(a, 7)}</g><g transform="translate(140,206)">${O.diamond(lt, 3.5)}</g>`;
  s += `<rect x="131" y="160" width="18" height="12" rx="3" fill="url(#m)"/><circle cx="140" cy="166" r="2" fill="${dk}"/>`;
  for (const x of [70, 96, 184, 210]) s += `<g transform="translate(${x},193)">${O.diamond(x < 140 ? a : a, 4)}</g>`;
  s += `<circle cx="83" cy="193" r="2" fill="${lt}"/><circle cx="197" cy="193" r="2" fill="${lt}"/>`;
  s += `<path d="M36,222 q-2,10 10,10 q8,0 8,-10 Z" fill="url(#m)"/><path d="M244,222 q2,10 -10,10 q-8,0 -8,-10 Z" fill="url(#m)"/>`;
  s += spark(O, 20, 30, 7, a) + spark(O, 262, 64, 6, lt) + spark(O, 14, 96, 4, lt) + spark(O, 268, 116, 4, a);
  return O.svg(280, 240, s);
}

// ---------- #9023: тұмар сырға — серьги-треугольники с изумрудом под аркой с рогами ----------
function tumarEar(m, g, p) {
  let s = hook(m, 2.8);
  s += `<circle cy="31" r="7.5" fill="${m}"/><circle cy="31" r="4" fill="${g}"/>`;
  s += `<path d="M-22,74 L0,40 L22,74 Z" fill="${m}" stroke="${m}" stroke-width="4" stroke-linejoin="round"/>`;
  s += `<path d="M-13,69 L0,49 L13,69 Z" fill="${g}"/>${glint(-2.5, 58, 1.8)}`;
  for (const x of [-16, 0, 16]) s += chain(x, 79, x ? 7 : 12, m, 1.5, 3.6) + `<g transform="translate(${x},${x ? 87 : 92})">${x ? `<circle cy="3.5" r="3.8" fill="${p}" stroke="${m}" stroke-width=".8"/>` : drop(5, g, m, 1.4)}</g>`;
  return s;
}
function tumarPair(P, O) {
  const defs = `<defs>${metalGrad('m', P.gold)}${gemGrad('g', P.accent)}${pearlGrad('p')}</defs>`;
  const e = tumarEar('url(#m)', 'url(#g)', 'url(#p)');
  // крючки смотрят внутрь, чтобы не задеть линии арки сверху
  return O.svg(130, 110, `${defs}${spark(O, 65, 58, 4.5, P.gold)}${spark(O, 65, 90, 3, P.accent)}
<g transform="translate(38,12) scale(-.9,.9)">${e}</g><g transform="translate(92,12) scale(.9)">${e}</g>`);
}

// ---------- #9024: жүзік пен сырға — кольцо с камнем между двумя серьгами-цветками ----------
function gulEar(m, g, p) {
  let s = hook(m, 2.6);
  for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; s += `<circle cx="${f(Math.sin(a) * 7.5)}" cy="${f(33 - Math.cos(a) * 7.5)}" r="5" fill="${g}" stroke="${m}" stroke-width="1.2"/>`; }
  s += `<circle cy="33" r="4.4" fill="${m}"/>`;
  s += chain(0, 45, 10, m, 1.5, 4);
  s += `<circle cy="64" r="7" fill="none" stroke="${m}" stroke-width="2.6"/>`;
  s += chain(0, 73, 6, m, 1.5, 3.5) + `<g transform="translate(0,80)">${drop(7, g, m, 1.6)}${glint(-2.2, 12.5)}</g>`;
  s += `<circle cy="${80 + 21 + 6}" r="5" fill="${p}" stroke="${m}" stroke-width=".8"/>`;
  return s;
}
function ringAndEarrings(P, O) {
  const defs = `<defs>${metalGrad('m', P.accent)}${gemGrad('g', P.gem)}${pearlGrad('p')}</defs>`;
  const m = 'url(#m)', e = gulEar(m, 'url(#g)', 'url(#p)');
  // кольцо: ободок в лёгкой перспективе, крапана и огранённый камень
  const ring = `<g transform="translate(100,70)">
<ellipse rx="27" ry="24" fill="none" stroke="${m}" stroke-width="7"/><ellipse rx="27" ry="24" fill="none" stroke="#ffffff" stroke-width="1" opacity=".5" transform="translate(-1,-1.5) scale(.93)"/>
<path d="M-11,-22 L-14,-34 M11,-22 L14,-34 M0,-24 L0,-34" stroke="${m}" stroke-width="3" stroke-linecap="round"/>
<path d="M-16,-40 L-9,-50 L9,-50 L16,-40 L0,-22 Z" fill="url(#g)" stroke="${P.accent}" stroke-width="1.4" stroke-linejoin="round"/>
<path d="M-16,-40 L16,-40 M-9,-50 L-4,-40 L0,-22 L4,-40 L9,-50" fill="none" stroke="#ffffff" stroke-width=".9" opacity=".7"/></g>`;
  return O.svg(200, 112, `${defs}${ring}${spark(O, 132, 22, 6, P.accent)}${spark(O, 70, 30, 4, P.name)}${spark(O, 100, 104, 4, P.accent)}
<g transform="translate(34,1)">${e}</g><g transform="translate(166,1) scale(-1,1)">${e}</g>`);
}

module.exports = [
  { id: 9021, slug: 'syrga-aishyq', category: 'syrga_salu', layout: 'classic',
    palette: { bg: '#fbf0ee', card: '#fffaf8', line: '#ecc9c4', ink: '#4b2a33', name: '#8f3a52', accent: '#b3843c', soft: '#f5ddd8',
      button: '#8f3a52', buttonText: '#fff3ec', gem: '#c8435f' },
    envelope: ['#9b4a5f', '#fff1e4'],
    style: { band: 'wave', divider: 'diamond', rosette: 'flower', heading: 'serif' },
    motif: syrgaPair, motifW: 320, motifH: 210 },
  { id: 9022, slug: 'syrga-shkatulka', category: 'syrga_salu', layout: 'darkhero',
    palette: { bg: '#fbf3ef', card: '#fffaf7', line: '#e6c3c3', ink: '#3c1a22', name: '#8a1a33', accent: '#a97b33', soft: '#f4dfdc',
      button: '#8a1a33', buttonText: '#fff2df', dark: '#4c0a19', light: '#fbe8d5', velvet: '#8e2238', gem: '#e0405e' },
    envelope: ['#6b1426', '#f6dcb4'],
    style: { band: 'horn', divider: 'horn', rosette: 'star8', heading: 'caps' },
    greeting: 'Құрметті құда-жекжат, ағайын-туыс!',
    motif: jewelBox, motifW: 280, motifH: 240 },
  { id: 9023, slug: 'syrga-tumar', category: 'syrga_salu', layout: 'arch',
    palette: { bg: '#f8f6ee', card: '#fffef9', line: '#c9dccf', ink: '#21352e', name: '#17614a', accent: '#1f7a5c', soft: '#e3efe7',
      button: '#17614a', buttonText: '#fdf8e8', gold: '#b8913f' },
    envelope: ['#17614a', '#f4e6bf'],
    style: { band: 'tumar', divider: 'tumar', rosette: 'horn8', heading: 'serif' },
    motif: tumarPair, motifW: 130, motifH: 110 },
  { id: 9024, slug: 'syrga-juzik', category: 'syrga_salu', layout: 'medallion',
    palette: { bg: '#f8f0f1', card: '#fffbfb', line: '#ddd0d4', ink: '#3d404b', name: '#9b4d63', accent: '#7c8191', soft: '#efdfe2',
      button: '#5c6272', buttonText: '#ffffff', gem: '#e48aa3' },
    envelope: ['#5c6272', '#f8e9ec'],
    style: { band: 'diamond', divider: 'wave', rosette: 'flower', heading: 'caps' },
    motif: ringAndEarrings, motifW: 200, motifH: 112 },
];
