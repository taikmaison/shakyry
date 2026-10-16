// Тұсаукесер: свои шаблоны #9005–#9009 (рисуем сами, SVG из кода). Формат описания — own/README.md.
// Ала жіп — чёрно-белая витая верёвка: рисуем её «прядями» вдоль кривой (rope), из неё же — бант, венок, шнур тұмара.

const BLACK = '#262626', WHITE = '#ffffff';
const f1 = n => +n.toFixed(1);

// смешать два цвета: k = 0 → a, k = 1 → b
function mix(a, b, k) {
  const p = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
  const A = p(a), B = p(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join('');
}

// ---------- кривые: цепочка кубических Безье [x0,y0,x1,y1,x2,y2,x3,y3], точки по длине ----------
const dOf = segs => segs.map((s, i) => `${i ? '' : `M${s[0]},${s[1]} `}C${s[2]},${s[3]} ${s[4]},${s[5]} ${s[6]},${s[7]}`).join(' ');
function chain(segs) {
  const pts = [];
  segs.forEach((s, j) => {
    for (let i = j ? 1 : 0; i <= 80; i++) {
      const t = i / 80, u = 1 - t;
      pts.push([u * u * u * s[0] + 3 * u * u * t * s[2] + 3 * u * t * t * s[4] + t * t * t * s[6], u * u * u * s[1] + 3 * u * u * t * s[3] + 3 * u * t * t * s[5] + t * t * t * s[7]]);
    }
  });
  const L = [0];
  for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const total = L[L.length - 1];
  const at = d => {
    let i = 1;
    while (i < L.length - 1 && L[i] < d) i++;
    const a = pts[i - 1], b = pts[i], k = (d - L[i - 1]) / ((L[i] - L[i - 1]) || 1);
    return { x: a[0] + (b[0] - a[0]) * k, y: a[1] + (b[1] - a[1]) * k, ang: Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI };
  };
  return { total, at };
}

// ала жіп вдоль кривой: косые пряди попеременно чёрные и белые; edge — светлая обводка (для тёмного фона)
function rope(segs, w = 12, o = {}) {
  const { total, at } = chain(segs), step = w * .58, n = Math.max(2, Math.round(total / step));
  const ink = o.ink || BLACK, d = dOf(segs);
  let s = o.edge ? `<path d="${d}" fill="none" stroke="${o.edge}" stroke-width="${f1(w * 1.5)}" stroke-linecap="round"/>` : '';
  s += `<path d="${d}" fill="none" stroke="${ink}" stroke-width="${w}" stroke-linecap="round"/>`;
  for (let i = 0; i < n; i++) {
    const p = at((i + .5) * total / n);
    s += `<ellipse transform="translate(${f1(p.x)},${f1(p.y)}) rotate(${f1(p.ang + 60)})" rx="${f1(w * .6)}" ry="${f1(step * .62)}" fill="${i % 2 ? WHITE : ink}" stroke="${ink}" stroke-width="${f1(Math.max(1, w * .1))}"/>`;
  }
  return s;
}

// размочаленный конец перерезанной верёвки: x,y — конец, dir = 1 вправо / -1 влево
const fray = (x, y, dir, w, ink = BLACK) => [[-34, WHITE], [-8, ink], [20, WHITE], [44, ink]].map(([a, c]) => {
  const r = (a * Math.PI) / 180, l = w * 1.05;
  return `<line x1="${x}" y1="${y}" x2="${f1(x + dir * Math.cos(r) * l)}" y2="${f1(y + Math.sin(r) * l)}" stroke="${ink}" stroke-width="${f1(w * .42)}" stroke-linecap="round"/><line x1="${x}" y1="${y}" x2="${f1(x + dir * Math.cos(r) * l)}" y2="${f1(y + Math.sin(r) * l)}" stroke="${c}" stroke-width="${f1(w * .22)}" stroke-linecap="round"/>`;
}).join('');

// шашақ — кисточка на конце шнура (верх в 0,0)
const tassel = (c, c2, s = 1) => `<g transform="scale(${s})"><path d="M-4,4 C-6,14 -9,22 -11,34 L11,34 C9,22 6,14 4,4 Z" fill="${c}"/>${[-7, -3.5, 0, 3.5, 7].map(x => `<line x1="${f1(x * .55)}" y1="12" x2="${x}" y2="33" stroke="${c2}" stroke-width=".9" opacity=".55"/>`).join('')}<rect x="-6" y="2" width="12" height="6" rx="3" fill="${c2}"/><circle r="5" fill="${c}"/></g>`;

// след детской ножки, носок вверх (правая; flip — левая); длина ~50
const SOLE = 'M1,25 C-5,25 -7.5,20 -7,15 C-6.5,10 -2.6,6 -3.4,0 C-4.2,-5 -11.5,-8 -11.5,-14 C-11.5,-20 -5.5,-22.5 0,-22.5 C6,-22.5 11,-18.5 11,-12 C11,-4 9,4 9.5,12 C10,20 7,25 1,25 Z';
const TOES = [[-6.8, -28.8, 4.6], [-0.4, -31.2, 3.5], [5, -30, 3], [9.2, -27.2, 2.6], [12.3, -23.2, 2.2]];
const foot = (c, x, y, a = 0, s = 1, flip = false) => `<g transform="translate(${x},${y}) rotate(${a}) scale(${flip ? -s : s},${s})"><path d="${SOLE}" fill="${c}"/>${TOES.map(([tx, ty, r]) => `<circle cx="${tx}" cy="${ty}" r="${r}" fill="${c}"/>`).join('')}</g>`;

// ================= #9005 мята: пара детских пинеток, связанных ала жіпом с бантом =================
function booties(P, O) {
  const ink = P.ink, body = P.soft, cuff = P.accent, sole = P.name;
  // пинетка носком вправо, низ подошвы — y = 92
  const BODY = 'M24,92 C12,92 8,84 10,72 L14,22 C14,14 20,10 28,10 L64,10 C72,10 75,15 74,22 L72,40 C96,33 122,43 126,63 C130,82 122,92 104,92 Z';
  const shoe = (id, tx, ty) => `<g transform="translate(${tx},${ty})"><clipPath id="${id}"><path d="${BODY}"/></clipPath>
<path d="${BODY}" fill="${body}"/><g clip-path="url(#${id})"><rect x="0" y="0" width="130" height="26" fill="${cuff}"/><rect x="0" y="82" width="130" height="12" fill="${sole}"/>
<path d="M78,48 C96,47 112,54 118,68" fill="none" stroke="${ink}" stroke-width="2.6" stroke-dasharray="5 5" stroke-linecap="round"/>
${[0, 1, 2].map(i => `<circle cx="${28 + i * 16}" cy="17" r="3" fill="${body}"/>`).join('')}</g>
<path d="${BODY}" fill="none" stroke="${ink}" stroke-width="5" stroke-linejoin="round"/><line x1="12" y1="26" x2="74" y2="26" stroke="${ink}" stroke-width="3.4"/>
${rope([[12, 36, 32, 38, 52, 38, 72, 36]], 8)}</g>`;
  // от завязок на щиколотках — к банту между пинетками
  const bx = 130, by = 68;
  const bow = rope([[78, 136, 92, 116, 112, 92, bx, by]], 8) + rope([[140, 148, 140, 120, 134, 92, bx, by]], 8)
    + rope([[bx, by, 116, 38, 84, 40, 90, 60], [90, 60, 94, 76, 116, 76, bx, by]], 9)
    + rope([[bx, by, 144, 38, 176, 40, 170, 60], [170, 60, 166, 76, 144, 76, bx, by]], 9)
    + `<circle cx="${bx}" cy="${by}" r="8" fill="${BLACK}"/><circle cx="${bx - 2}" cy="${by - 2}" r="2.6" fill="${WHITE}"/>`;
  const sparkle = (x, y, r) => `<g transform="translate(${x},${y})">${O.star(P.accent, r)}</g>`;
  return O.svg(260, 210, `${shoe('s1', 4, 100)}${shoe('s2', 128, 112)}${bow}${sparkle(40, 56, 12)}${sparkle(222, 50, 10)}${sparkle(66, 20, 6)}${sparkle(200, 92, 5)}${sparkle(24, 96, 5)}`);
}

// ================= #9006 изумруд (тёмная шапка): ножницы перерезают ала жіп =================
function scissors(P, O) {
  const gold = P.accent, hi = mix(P.accent, '#ffffff', .55), lo = mix(P.accent, '#000000', .3), light = P.ink; // P.ink — светлый текст шапки
  // половина ножниц в своей системе: ось — y, шарнир в 0,0, лезвие вниз, кольцо вверху
  const half = (rot, flip) => `<g transform="rotate(${rot}) scale(${flip ? -1 : 1},1)">
<path d="M-7,-6 C-9,22 -6,52 1,88 C5,58 8,26 7,-6 Z" fill="url(#gb)" stroke="${lo}" stroke-width="1.6" stroke-linejoin="round"/>
<path d="M1,4 C1.5,30 2,56 1,82" stroke="${hi}" stroke-width="1.8" fill="none" stroke-linecap="round"/>
<path d="M-6,-4 L-6,-30 C-6,-36 -3,-38 0,-40 L8,-40 L7,-4 Z" fill="${gold}" stroke="${lo}" stroke-width="1.6" stroke-linejoin="round"/>
<ellipse cx="6" cy="-62" rx="18" ry="23" fill="none" stroke="${gold}" stroke-width="8"/><ellipse cx="6" cy="-62" rx="18" ry="23" fill="none" stroke="${hi}" stroke-width="1.6" stroke-dasharray="2 5"/>
<g transform="translate(30,-74) rotate(25) scale(.3)">${O.halfHorn(gold, 9)}</g></g>`;
  const cord = rope([[10, 166, 50, 176, 100, 182, 140, 179]], 13, { edge: light }) + rope([[186, 179, 226, 182, 272, 176, 312, 164]], 13, { edge: light })
    + fray(140, 179, 1, 13) + fray(186, 179, -1, 13);
  const sp = (x, y, r, c = light, n = 4) => `<g transform="translate(${x},${y})">${O.star(c, r, n)}</g>`;
  return O.svg(320, 230, `<defs><linearGradient id="gb" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${hi}"/><stop offset=".55" stop-color="${gold}"/><stop offset="1" stop-color="${lo}"/></linearGradient></defs>
${cord}<g transform="translate(163,110) rotate(-6)">${half(21, false)}${half(-21, true)}<circle r="7" fill="${gold}" stroke="${lo}" stroke-width="1.6"/><circle r="2.4" fill="${lo}"/></g>
${sp(112, 136, 9)}${sp(214, 140, 7, gold)}${sp(76, 60, 6, gold)}${sp(250, 70, 10)}${sp(56, 120, 4)}${sp(274, 120, 4, gold)}${sp(162, 214, 5)}`);
}

// ================= #9007 сирень: дорожка из следов малыша и звёзды =================
function stepsPath(P, O) {
  const c = P.name, g = P.accent;
  const x0 = 78, y0 = 178, x1 = 352, y1 = 66, th = Math.atan2(y1 - y0, x1 - x0), dx = Math.cos(th), dy = Math.sin(th);
  let steps = '';
  for (let i = 0; i < 6; i++) {
    const t = i / 5, side = i % 2 ? -1 : 1, off = 15 * side;   // side 1 — левая ножка (слева от направления)
    const x = x0 + (x1 - x0) * t + dy * off, y = y0 + (y1 - y0) * t - dx * off;
    steps += foot(c, f1(x), f1(y), f1(th * 180 / Math.PI + 90), 1.12 + t * .12, side === 1);
  }
  const st = (x, y, r, n = 4, col = g) => `<g transform="translate(${x},${y})">${O.star(col, r, n)}</g>`;
  const cut = rope([[8, 214, 24, 211, 42, 209, 58, 209]], 12) + fray(58, 209, 1, 12) + rope([[92, 209, 108, 209, 126, 211, 142, 215]], 12) + fray(92, 209, -1, 12);
  return O.svg(400, 230, `${cut}${steps}${st(120, 92, 12)}${st(214, 46, 8, 5)}${st(296, 156, 12)}${st(376, 128, 8)}${st(44, 132, 8, 5)}${st(362, 18, 9)}${st(226, 188, 6)}<circle cx="168" cy="70" r="3.2" fill="${g}"/><circle cx="330" cy="196" r="3.2" fill="${g}"/><circle cx="76" cy="96" r="3" fill="${g}"/>`);
}

// ================= #9008 терракота: венок из ала жіп с бантом и кисточками, внутри — следы =================
function wreath(P, O) {
  const c = P.accent, k = .5523, R = 86, cx = 140, cy = 112;
  // окружность от низа по часовой и обратно к низу (четыре дуги)
  const q = [[cx, cy + R], [cx - R, cy], [cx, cy - R], [cx + R, cy], [cx, cy + R]];
  const arc = i => { const [a, b] = [q[i], q[i + 1]], d = R * k; const ta = [[-1, 0], [0, -1], [1, 0], [0, 1]][i], tb = [[0, -1], [1, 0], [0, 1], [-1, 0]][i];
    return [a[0], a[1], a[0] + ta[0] * d, a[1] + ta[1] * d, b[0] - tb[0] * d, b[1] - tb[1] * d, b[0], b[1]]; };
  const ring = rope([0, 1, 2, 3].map(arc), 12);
  const by = cy + R;
  const e = { edge: P.bg };
  const bow = rope([[cx, by, cx - 8, by + 12, cx - 22, by + 22, cx - 30, by + 38]], 9, e) + rope([[cx, by, cx + 8, by + 12, cx + 22, by + 22, cx + 30, by + 38]], 9, e)
    + rope([[cx, by, cx - 14, by - 22, cx - 58, by - 22, cx - 58, by + 2], [cx - 58, by + 2, cx - 58, by + 24, cx - 16, by + 14, cx, by]], 10, e)
    + rope([[cx, by, cx + 14, by - 22, cx + 58, by - 22, cx + 58, by + 2], [cx + 58, by + 2, cx + 58, by + 24, cx + 16, by + 14, cx, by]], 10, e)
    + `<ellipse cx="${cx}" cy="${by}" rx="11" ry="10" fill="${BLACK}" stroke="${P.bg}" stroke-width="3"/><ellipse cx="${cx - 2}" cy="${by - 2}" rx="3" ry="2.4" fill="${WHITE}"/>`
    + `<g transform="translate(${cx - 31},${by + 38}) rotate(14)">${tassel(c, P.soft, .9)}</g><g transform="translate(${cx + 31},${by + 38}) rotate(-14)">${tassel(c, P.soft, .9)}</g>`;
  let deco = '';
  for (let a = -112.5; a <= 112.5; a += 45) { const r = (a - 90) * Math.PI / 180; deco += `<g transform="translate(${f1(cx + Math.cos(r) * (R + 18))},${f1(cy + Math.sin(r) * (R + 18))}) rotate(${a})">${O.diamond(c, 6)}</g>`; }
  for (let a = -135; a <= 135; a += 45) { const r = (a - 90) * Math.PI / 180; deco += `<circle cx="${f1(cx + Math.cos(r) * (R + 17))}" cy="${f1(cy + Math.sin(r) * (R + 17))}" r="2.6" fill="${P.name}"/>`; }
  const feet = foot(P.name, cx - 22, cy + 6, -8, 1.5, true) + foot(P.name, cx + 22, cy - 6, 8, 1.5);
  return O.svg(280, 260, `<circle cx="${cx}" cy="${cy}" r="${R - 12}" fill="${P.soft}"/>${deco}${ring}${feet}${bow}`);
}

// ================= #9009 небо и персик: тұмар на шнуре из ала жіп, внутри — следы =================
function tumarFeet(P, O) {
  const ink = P.ink, peach = P.accent, sky = P.name, soft = P.soft;
  const tri = 'M64,118 L196,118 L130,234 Z', inner = 'M80,128 L180,128 L130,216 Z';
  const cord = rope([[74, 106, 80, 70, 110, 40, 130, 26]], 9) + rope([[186, 106, 180, 70, 150, 40, 130, 26]], 9)
    + `<circle cx="130" cy="26" r="8" fill="${BLACK}"/><circle cx="128" cy="24" r="2.6" fill="${WHITE}"/>`;
  const st = (x, y, r, n = 4) => `<g transform="translate(${x},${y})">${O.star(peach, r, n)}</g>`;
  return O.svg(260, 280, `${cord}
<path d="${tri}" fill="${soft}" stroke="${ink}" stroke-width="5" stroke-linejoin="round"/><path d="${inner}" fill="none" stroke="${peach}" stroke-width="2.4" stroke-dasharray="1 6" stroke-linecap="round"/>
<rect x="58" y="98" width="144" height="24" rx="12" fill="${peach}" stroke="${ink}" stroke-width="4.5"/>${[56, 204].map(x => `<circle cx="${x}" cy="110" r="9" fill="${ink}"/><circle cx="${x}" cy="110" r="3.4" fill="${peach}"/>`).join('')}${[78, 104, 130, 156, 182].map(x => `<g transform="translate(${x},110)">${O.diamond(ink, 4.5)}</g>`).join('')}
${foot(sky, 115, 178, -6, 1.1, true)}${foot(sky, 145, 168, 6, 1.1)}
<g transform="translate(130,236)">${tassel(peach, ink, 1)}</g>
${st(32, 150, 11)}${st(228, 150, 11)}${st(52, 64, 7, 5)}${st(208, 64, 7, 5)}${st(26, 222, 6)}${st(234, 222, 6)}`);
}

module.exports = [
  { id: 9005, slug: 'tusau-aqua', category: 'tusaukeser', layout: 'arch',
    palette: { bg: '#edf8f7', card: '#fbfefe', line: '#bde1de', ink: '#1b4346', name: '#0c6b70', accent: '#c9593a', soft: '#d2eeeb', button: '#0c6b70', buttonText: '#ffffff' },
    envelope: ['#0c6b70', '#fde3d6'], style: { band: 'diamond', divider: 'diamond', rosette: 'horn8', heading: 'serif' },
    motif: booties, motifW: 130, motifH: 105 },
  { id: 9006, slug: 'tusau-cinnamon', category: 'tusaukeser', layout: 'darkhero',
    palette: { bg: '#fbf4ec', card: '#fffaf4', line: '#e9d3c0', ink: '#3f2a20', name: '#7c321f', accent: '#c48a32', soft: '#f3e2d2', button: '#7c321f', buttonText: '#fdedd0', dark: '#62271a', light: '#fbefdc' },
    envelope: ['#62271a', '#f0d39a'], style: { band: 'horn', divider: 'tumar', rosette: 'star8', heading: 'serif' },
    motif: scissors, motifW: 300, motifH: 216 },
  { id: 9007, slug: 'tusau-lilac', category: 'tusaukeser', layout: 'medallion',
    palette: { bg: '#f6f2fa', card: '#fefcff', line: '#dccfeb', ink: '#3a3150', name: '#5a3d86', accent: '#a9853a', soft: '#ece3f6', button: '#62468f', buttonText: '#ffffff' },
    envelope: ['#62468f', '#f3e6c4'], style: { band: 'wave', divider: 'wave', rosette: 'flower', heading: 'caps' },
    motif: stepsPath, motifW: 200, motifH: 110 },
  { id: 9008, slug: 'tusau-sunflower', category: 'tusaukeser', layout: 'bordered',
    palette: { bg: '#fcf6e1', card: '#fffdf3', line: '#ecd9a2', ink: '#3d3222', name: '#6e4a1c', accent: '#b07f0c', soft: '#f8e6a8', button: '#6e4a1c', buttonText: '#fff6dc' },
    envelope: ['#6e4a1c', '#f8e6a8'], style: { band: 'diamond', divider: 'horn', rosette: 'flower', heading: 'caps' },
    motif: wreath, motifW: 250, motifH: 232 },
  { id: 9009, slug: 'tusau-sky', category: 'tusaukeser', layout: 'classic',
    palette: { bg: '#fdf3ee', card: '#fffaf7', line: '#f0d6c6', ink: '#29475f', name: '#2c6596', accent: '#cf6e45', soft: '#fde3d4', button: '#2c6596', buttonText: '#ffffff' },
    envelope: ['#2c6596', '#fde3d4'], style: { band: 'tumar', divider: 'diamond', rosette: 'star8', heading: 'caps' },
    motif: tumarFeet, motifW: 220, motifH: 237 },
];
