// Сүндет той: #9017 ақбоз ат, #9018 тақия, #9019 тақа, #9020 ай мен жұлдыз под порталом.
// Формат описания — own/README.md. Все рисунки — свои, из кода.

// восьмиконечная звезда из двух квадратов (центр 0,0)
const star8 = (c, r) => { const a = r * .72; return `<rect x="${-a}" y="${-a}" width="${2 * a}" height="${2 * a}" fill="${c}"/><rect x="${-a}" y="${-a}" width="${2 * a}" height="${2 * a}" fill="${c}" transform="rotate(45)"/>`; };

// ақбоз ат: белый конь в профиль, одна нога поднята; узорное седло (ер-тоқым), нагрудник, уздечка; месяц и звёзды
function tulpar(P, O) {
  const c = P.accent, ink = P.ink, dk = P.soft;
  const far = [
    'M194,140 L210,142 C218,150 230,154 240,160 C245,163 244,170 239,172 L235,190 C233,196 225,196 225,190 L229,172 C214,166 200,158 194,140 Z',
    'M120,144 C124,158 132,166 134,174 L132,192 C132,199 134,205 136,209 L134,214 L150,214 L148,206 L146,192 C148,176 152,162 154,148 Z',
  ].map(d => `<path d="${d}" fill="${ink}" fill-opacity=".78"/>`).join('');
  const body = [
    // корпус
    'M100,104 C108,92 134,94 152,99 C168,103 178,96 194,94 C212,92 226,104 228,122 C230,140 216,152 198,152 L136,154 C114,156 96,144 94,126 C93,117 95,110 100,104 Z',
    // шея
    'M176,100 C178,78 196,54 220,40 C228,35 238,36 244,42 L254,72 C244,84 234,100 228,126 L204,118 Z',
    // голова
    'M234,34 C242,28 252,32 258,40 L284,82 C290,92 287,104 276,105 C268,106 262,100 256,96 C246,92 238,84 236,74 C232,62 228,44 234,34 Z',
    // уши
    'M236,36 L234,14 L246,32 Z', 'M244,34 L248,15 L254,38 Z',
    // ближние ноги: передняя опорная, задняя
    'M208,142 L226,138 C226,152 222,164 221,174 L220,200 C221,205 225,209 227,214 L210,214 C210,208 211,203 211,198 L210,175 C208,164 207,154 208,142 Z',
    'M98,126 C98,148 112,158 116,168 L110,186 C108,196 110,203 112,208 L108,214 L127,214 L125,206 L123,188 C129,172 138,160 142,142 Z',
    // хвост
    'M100,102 C82,96 66,108 68,128 C70,148 60,166 48,180 C70,178 86,162 89,142 C91,128 94,116 102,110 Z',
  ].map(d => `<path d="${d}" fill="${ink}"/>`).join('');
  // грива — завитки вдоль шеи
  const mane = [[180, 88, -70], [188, 74, -62], [198, 62, -52], [210, 51, -44], [222, 43, -36]].map(([x, y, a]) =>
    `<path d="M0,0 c-4,-8 -2,-16 6,-18 c6,-1 8,6 3,8" transform="translate(${x},${y}) rotate(${a + 60})" fill="none" stroke="${c}" stroke-width="3" stroke-linecap="round"/>`).join('');
  // копыта
  const hooves = [[210, 227], [108, 127], [134, 150]].map(([a, b]) => `<rect x="${a}" y="209" width="${b - a}" height="6" rx="2" fill="${c}"/>`).join('')
    + `<path d="M225,190 C226,196 234,196 235,190 L236,186 L226,186 Z" fill="${c}"/>`;
  // ер-тоқым
  const saddle = `<path d="M142,100 C158,103 172,99 192,96 L196,134 C182,146 154,146 140,138 Z" fill="${c}"/>
<path d="M147,106 C160,108 172,105 188,102 L190,130 C178,139 157,139 146,133 Z" fill="none" stroke="${dk}" stroke-width="1.4"/>
<g transform="translate(168,124) scale(.26)">${O.horn(dk, 9)}</g>
<path d="M146,98 C144,86 150,82 154,86 C162,94 176,92 184,84 C188,79 194,82 192,92 L190,100 C176,104 160,104 146,102 Z" fill="${c}" stroke="${dk}" stroke-width="1.6"/>
<line x1="168" y1="140" x2="168" y2="160" stroke="${c}" stroke-width="2.2"/><path d="M161,160 L175,160 L172,168 L164,168 Z" fill="${c}"/>`;
  // нагрудник (өмілдірік) и уздечка
  const tack = `<path d="M194,98 C204,112 214,122 228,128" fill="none" stroke="${c}" stroke-width="4" stroke-linecap="round"/>
<circle cx="214" cy="119" r="5" fill="${c}" stroke="${dk}" stroke-width="1.2"/><path d="M214,124 L214,134" stroke="${c}" stroke-width="2"/><g transform="translate(214,137)">${O.diamond(c, 4)}</g>
<path d="M242,40 L263,95 M253,89 L283,80" fill="none" stroke="${c}" stroke-width="2.4" stroke-linecap="round"/>
<path d="M266,100 C240,112 212,104 190,88" fill="none" stroke="${c}" stroke-width="1.8"/>
<circle cx="250" cy="52" r="3" fill="${dk}"/><circle cx="281" cy="94" r="2" fill="${dk}"/>`;
  // небо и земля
  const sky = `<g transform="translate(58,44)"><path d="M6,-24 a26,26 0 1,0 0,48 a20,20 0 1,1 0,-48 Z" fill="${c}"/></g>
<g transform="translate(104,26)">${O.star(c, 7)}</g><g transform="translate(26,96)">${O.star(c, 5)}</g><g transform="translate(140,56)">${O.star(c, 4)}</g><g transform="translate(296,30)">${O.star(c, 5)}</g>`;
  const ground = `<path d="M30,220 Q160,232 296,220" fill="none" stroke="${c}" stroke-width="2"/><g transform="translate(163,228)">${O.diamond(c, 5)}</g><g transform="translate(60,224)">${O.diamond(c, 3)}</g><g transform="translate(266,224)">${O.diamond(c, 3)}</g>`;
  return O.svg(320, 240, `${sky}${far}${body}${hooves}${mane}${saddle}${tack}${ground}`);
}

// тақия мальчика: купол из клиньев с вышитыми рогами, околыш с ромбами, на макушке пучок үкі
function takiya(P, O) {
  const c = P.accent, ink = P.ink, cap = P.name, light = P.card;
  // перо филина (үкі): светлое, с тёмными поперечными полосками
  const feather = a => `<g transform="translate(130,80) rotate(${a})"><path d="M0,0 C-10,-16 -11,-40 0,-56 C11,-40 10,-16 0,0 Z" fill="${light}" stroke="${ink}" stroke-width="1.5"/>
<path d="M-6,-20 L0,-25 L6,-20 M-6,-32 L0,-37 L6,-32 M-4,-43 L0,-47 L4,-43" fill="none" stroke="${ink}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></g>`;
  let s = [-40, 40, -20, 20, 0].map(feather).join('');
  s += `<path d="M38,162 C40,116 82,88 130,86 C178,88 220,116 222,162 Z" fill="${cap}" stroke="${ink}" stroke-width="3" stroke-linejoin="round"/>
<path d="M130,88 C110,104 97,132 92,162 M130,88 C150,104 163,132 168,162" fill="none" stroke="${c}" stroke-width="2"/>
<g transform="translate(130,120) scale(.42)">${O.horn(c, 8)}</g>
<g transform="translate(70,134) rotate(-16) scale(.25)">${O.horn(c, 9)}</g><g transform="translate(190,134) rotate(16) scale(.25)">${O.horn(c, 9)}</g>
<path d="M34,156 C80,168 180,168 226,156 L228,186 C184,198 76,198 32,186 Z" fill="${c}" stroke="${ink}" stroke-width="2.6" stroke-linejoin="round"/>`;
  for (let i = 0; i < 10; i++) { const x = 44 + i * 19.1, y = 174 + 6 * Math.sin(Math.PI * (i / 9)); s += `<g transform="translate(${x.toFixed(1)},${y.toFixed(1)})">${O.diamond(cap, 5)}</g>`; }
  s += `<path d="M124,86 L136,86 L134,72 L126,72 Z" fill="${c}" stroke="${ink}" stroke-width="1.4" stroke-linejoin="round"/><circle cx="130" cy="86" r="6" fill="${c}" stroke="${ink}" stroke-width="1.8"/>
<g transform="translate(24,104)">${O.star(c, 8)}</g><g transform="translate(236,104)">${O.star(c, 8)}</g><g transform="translate(46,70)">${O.star(c, 4.5)}</g><g transform="translate(214,70)">${O.star(c, 4.5)}</g>`;
  return O.svg(260, 204, s, '0 10 260 194');
}

// звезда с n лучами (k — доля внутреннего радиуса)
const starN = (c, r, n = 5, k = .45) => {
  const pts = [];
  for (let i = 0; i < n * 2; i++) { const a = Math.PI * i / n - Math.PI / 2, rr = i % 2 ? r * k : r; pts.push(`${(Math.cos(a) * rr).toFixed(2)},${(Math.sin(a) * rr).toFixed(2)}`); }
  return `<path d="M${pts.join(' L')} Z" fill="${c}"/>`;
};

// тақа (подкова) концами вверх — на счастье; внутри звезда, по бокам рога
function taqa(P, O) {
  const c = P.accent, ink = P.ink, w = P.card;
  const cx = 100, cy = 56, r = 34;
  const pt = a => [cx + r * Math.cos(a * Math.PI / 180), cy + r * Math.sin(a * Math.PI / 180)].map(v => v.toFixed(1));
  const [x1, y1] = pt(-122), [x2, y2] = pt(-58);
  const arc = `M${x1},${y1} A${r},${r} 0 1,0 ${x2},${y2}`;
  let s = `<path d="${arc}" fill="none" stroke="${ink}" stroke-width="19"/><path d="${arc}" fill="none" stroke="${c}" stroke-width="14"/>`;
  s += [200, 165, 130, -20, 15, 50].map(a => { const [x, y] = pt(a); return `<circle cx="${x}" cy="${y}" r="2.4" fill="${w}"/>`; }).join('');
  s += `<g transform="translate(${cx},${cy + 2})">${starN(ink, 16)}</g><g transform="translate(${cx},16)">${O.star(c, 7)}</g><g transform="translate(${cx - 16},6)">${O.star(c, 4)}</g><g transform="translate(${cx + 16},6)">${O.star(c, 4)}</g>`;
  // боковые рога
  s += `<line x1="18" y1="64" x2="56" y2="64" stroke="${c}" stroke-width="1.6"/><line x1="144" y1="64" x2="182" y2="64" stroke="${c}" stroke-width="1.6"/>
<g transform="translate(40,54) scale(.3)">${O.horn(ink, 8)}</g><g transform="translate(160,54) scale(.3)">${O.horn(ink, 8)}</g>
<g transform="translate(12,64)">${O.diamond(c, 4)}</g><g transform="translate(188,64)">${O.diamond(c, 4)}</g>`;
  return O.svg(200, 110, s);
}

// ай мен жұлдыз: под стрельчатым порталом (күмбез) на нити висит месяц со звездой, по бокам звёзды
function aiJuldyz(P, O) {
  const c = P.accent, fr = P.name, ink = P.ink, card = P.card;
  const outer = 'M36,222 L36,118 C36,78 74,58 100,42 C110,36 116,28 120,12 C124,28 130,36 140,42 C166,58 204,78 204,118 L204,222 Z';
  const inner = 'M50,222 L50,120 C50,86 84,68 106,54 C113,50 117,44 120,34 C123,44 127,50 134,54 C156,68 190,86 190,120 L190,222 Z';
  // точки по середине рамки: кривая посередине между внешним и внутренним сводом
  const bz = (t, p0, p1, p2, p3) => (1 - t) ** 3 * p0 + 3 * (1 - t) ** 2 * t * p1 + 3 * (1 - t) * t * t * p2 + t ** 3 * p3;
  let dots = '';
  for (const t of [.12, .38, .64, .88]) {
    const x = bz(t, 43, 43, 79, 103), y = bz(t, 119, 82, 63, 48);
    dots += `<g transform="translate(${x.toFixed(1)},${y.toFixed(1)})">${O.diamond(c, 3.2)}</g><g transform="translate(${(240 - x).toFixed(1)},${y.toFixed(1)})">${O.diamond(c, 3.2)}</g>`;
  }
  for (let y = 138; y < 220; y += 20) dots += `<g transform="translate(43,${y})">${O.diamond(c, 3.2)}</g><g transform="translate(197,${y})">${O.diamond(c, 3.2)}</g>`;
  return O.svg(240, 232, `<defs><mask id="cr"><rect x="-60" y="-60" width="120" height="120" fill="#fff"/><circle cx="12" cy="-10" r="31" fill="#000"/></mask></defs>
<path d="${outer}" fill="${fr}" stroke="${fr}" stroke-width="2" stroke-linejoin="round"/><path d="${inner}" fill="${card}" stroke="${c}" stroke-width="1.6"/>${dots}
<g transform="translate(120,8)">${O.diamond(c, 6)}</g>
<path d="M120,36 L120,89" stroke="${c}" stroke-width="1.4"/><g transform="translate(120,58)">${O.diamond(c, 4)}</g>
<g transform="translate(114,122) rotate(-14)"><circle r="36" fill="${c}" mask="url(#cr)"/></g>
<g transform="translate(134,114) rotate(10)">${starN(fr, 17)}</g>
<path d="M68,80 L68,112 M172,80 L172,98" stroke="${c}" stroke-width="1.2"/><g transform="translate(68,121)">${O.star(c, 9)}</g><g transform="translate(172,107)">${O.star(c, 9)}</g>
<g transform="translate(120,190) scale(.46)">${O.horn(c, 8)}</g><line x1="58" y1="214" x2="182" y2="214" stroke="${c}" stroke-width="1.4"/>
<rect x="26" y="220" width="188" height="9" rx="3" fill="${fr}"/>
<g transform="translate(14,96)">${O.star(c, 7)}</g><g transform="translate(226,96)">${O.star(c, 7)}</g><g transform="translate(22,52)">${O.star(c, 4)}</g><g transform="translate(218,52)">${O.star(c, 4)}</g>`);
}

module.exports = [
  { id: 9017, slug: 'sundet-akboz', category: 'sundet', layout: 'darkhero',
    palette: { bg: '#f5f2ea', card: '#fffcf4', line: '#d9cca8', ink: '#1b2438', name: '#1b2438', accent: '#c29433', soft: '#ebe3cf', button: '#16203a', buttonText: '#f0d99a',
      dark: '#121a30', light: '#f6ead0' },
    envelope: ['#16203a', '#e9cf8e'], style: { band: 'diamond', divider: 'wave', rosette: 'star8', heading: 'caps' },
    motif: tulpar, motifW: 320, motifH: 240 },
  { id: 9018, slug: 'sundet-takiya', category: 'sundet', layout: 'bordered',
    palette: { bg: '#f8f1e9', card: '#fffbf6', line: '#e4d0c0', ink: '#3a1d22', name: '#7a1f2e', accent: '#b38a3c', soft: '#f2e2d6', button: '#7a1f2e', buttonText: '#fdf0d2' },
    envelope: ['#6e1a28', '#f3d9a4'], style: { band: 'horn', divider: 'diamond', rosette: 'horn8', heading: 'caps' },
    motif: takiya, motifW: 250, motifH: 192 },
  { id: 9019, slug: 'sundet-taqa', category: 'sundet', layout: 'medallion',
    palette: { bg: '#eef7fc', card: '#ffffff', line: '#bcdaee', ink: '#173a57', name: '#145c8c', accent: '#2f8ac4', soft: '#dceefa', button: '#1d6fa5', buttonText: '#ffffff' },
    envelope: ['#2a7fb8', '#ffffff'], style: { band: 'tumar', divider: 'horn', rosette: 'flower', heading: 'serif' },
    motif: taqa, motifW: 200, motifH: 110 },
  { id: 9020, slug: 'sundet-ai', category: 'sundet', layout: 'classic',
    palette: { bg: '#f0f6f5', card: '#ffffff', line: '#c2dedb', ink: '#163c3d', name: '#0c6466', accent: '#b5892e', soft: '#dcefed', button: '#0c6466', buttonText: '#fdf2d3' },
    envelope: ['#0c6466', '#f3dfa6'], style: { band: 'wave', divider: 'tumar', rosette: 'star8', heading: 'serif' },
    motif: aiJuldyz, motifW: 236, motifH: 228 },
];
