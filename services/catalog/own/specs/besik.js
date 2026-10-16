// Бесік той: #9013–#9016. Всё нарисовано здесь же, в коде (SVG), формат описания — own/README.md.
//   #9013 classic   — бесік в три четверти: узорное одеяло (көрпе), малыш в шапочке, арқалық, полозья
//   #9014 darkhero  — ночь (тёмная бирюза): месяц-колыбель с малышом в құндақ, облака и звёзды
//   #9015 arch      — үкі и тұмар с кистями, висящие с вершины арки
//   #9016 medallion — гирлянда: флажки с орнаментом, звёзды и месяц (терракота с шалфеем)

// бесік в три четверти: точки (x — вдоль бесіка, y — высота, z — вглубь) проецируются на плоскость;
// кривые Безье при такой (аффинной) проекции остаются кривыми, поэтому контуры получаются точными
function korpe(P, O) {
  const c = P.accent, ink = P.ink, wood = '#f7e4d9', woodD = '#e8c6b6', rose = '#d98b9a', roseD = '#c06f80', cream = '#fffaf5', skin = '#f9dcc8';
  const Lx = .92, Ly = .16, Dx = .56, Dy = -.3, ox = 40, oy = 214;
  const q = (x, y, z) => [ox + x * Lx + z * Dx, oy + x * Ly - y + z * Dy];
  const p = (x, y, z) => q(x, y, z).map(v => v.toFixed(1)).join(',');
  const at = (x, y, z) => `translate(${p(x, y, z)})`;
  const board = x => `M${p(x, 26, 6)} L${p(x, 118, 4)} C${p(x, 140, 4)} ${p(x, 152, 24)} ${p(x, 152, 42)} C${p(x, 152, 60)} ${p(x, 140, 80)} ${p(x, 118, 80)} L${p(x, 26, 78)} Z`;
  const rocker = z => `M${p(-30, 38, z)} C${p(30, -6, z)} ${p(170, -6, z)} ${p(230, 38, z)}`;
  const rod = (d, w) => `<path d="${d}" fill="none" stroke="${ink}" stroke-width="${w}" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${wood}" stroke-width="${w - 5.5}" stroke-linecap="round"/>`;
  const line = (a, b, col, w) => `<line x1="${q(...a)[0].toFixed(1)}" y1="${q(...a)[1].toFixed(1)}" x2="${q(...b)[0].toFixed(1)}" y2="${q(...b)[1].toFixed(1)}" stroke="${col}" stroke-width="${w}" stroke-linecap="round"/>`;
  let s = '';
  // звёздочки вокруг
  for (const [x, y, r] of [[232, 26, 10], [270, 50, 6], [196, 16, 5], [26, 78, 7], [118, 26, 6]]) s += `<g transform="translate(${x},${y})">${O.star(c, r)}</g>`;
  // дальний полоз и изголовье (видна его внутренняя сторона)
  s += rod(rocker(74), 10);
  s += `<path d="${board(0)}" fill="${wood}" stroke="${ink}" stroke-width="3" stroke-linejoin="round"/>`;
  s += `<g transform="${at(0, 112, 42)} matrix(${Dx} ${Dy} 0 1 0 0)">${O.diamond(c, 8)}</g>`;
  // внутри у изголовья: подушка и малыш в шапочке
  s += `<path d="M${p(0, 96, 4)} L${p(60, 96, 4)} L${p(60, 96, 80)} L${p(0, 96, 80)} Z" fill="${woodD}" stroke="${ink}" stroke-width="2.4" stroke-linejoin="round"/>`;
  s += `<ellipse transform="${at(26, 100, 44)} rotate(-28)" rx="30" ry="12" fill="${cream}" stroke="${ink}" stroke-width="2"/>`;
  s += `<g transform="${at(28, 110, 44)}"><circle r="17" fill="${skin}" stroke="${ink}" stroke-width="2.4"/>
<path d="M-16.4,-4 A17,17 0 0,1 16.4,-4 Z" fill="${rose}" stroke="${ink}" stroke-width="2.2" stroke-linejoin="round"/><line x1="-16" y1="-4" x2="16" y2="-4" stroke="${c}" stroke-width="2.6"/><circle cy="-19" r="3.2" fill="${c}"/>
<path d="M-9,4 q3.5,3.5 7,0 M2,4 q3.5,3.5 7,0" fill="none" stroke="${ink}" stroke-width="1.7" stroke-linecap="round"/><circle cx="-9" cy="10" r="3" fill="#f2a3a6" opacity=".75"/><circle cx="9" cy="10" r="3" fill="#f2a3a6" opacity=".75"/><path d="M-2,11.5 q2,1.6 4,0" fill="none" stroke="${ink}" stroke-width="1.4" stroke-linecap="round"/></g>`;
  // передняя стенка с рогами
  s += `<path d="M${p(0, 96, 4)} L${p(200, 96, 4)} L${p(200, 46, 4)} C${p(140, 32, 4)} ${p(60, 32, 4)} ${p(0, 46, 4)} Z" fill="${wood}" stroke="${ink}" stroke-width="3" stroke-linejoin="round"/>`;
  s += `<g transform="${at(126, 62, 4)} matrix(${Lx} ${Ly} 0 1 0 0)"><g transform="translate(0,-8) scale(.42)">${O.horn(c, 7)}</g>${[-46, 46].map(u => `<g transform="translate(${u},2)">${O.diamond(c, 5)}</g>`).join('')}${[-84, 84].map(u => `<circle cx="${u}" cy="2" r="2.6" fill="${c}"/>`).join('')}</g>`;
  // одеяло: верх (стёганый ромбами), отворот у груди, свес на переднюю стенку с фестонами
  let hem = `M${p(54, 80, 2)} L${p(54, 98, 2)} C${p(54, 114, 26)} ${p(54, 114, 60)} ${p(54, 104, 80)} C${p(100, 116, 78)} ${p(160, 116, 78)} ${p(204, 104, 80)} L${p(204, 80, 2)}`;
  for (let x = 204; x > 56; x -= 14.8) hem += ` Q${p(x - 7.4, 71, 2)} ${p(x - 14.8, 80, 2)}`;
  hem += ' Z';
  s += `<defs><clipPath id="kc"><path d="${hem}"/></clipPath></defs><path d="${hem}" fill="${rose}"/><g clip-path="url(#kc)">`;
  for (let k = -120; k < 260; k += 22) s += line([k, 105, 0], [k + 90, 105, 90], '#f6d2d9', 1.6) + line([k, 105, 90], [k + 90, 105, 0], '#f6d2d9', 1.6);
  for (let k = -120; k < 260; k += 22) for (let z = 11; z < 90; z += 22) { const [X, Y] = q(k + z, 105, z); s += `<circle cx="${X.toFixed(1)}" cy="${Y.toFixed(1)}" r="2.2" fill="${c}"/>`; }
  s += `<path d="M${p(40, 98, 2)} L${p(210, 98, 2)} L${p(210, 60, 2)} L${p(40, 60, 2)} Z" fill="${roseD}"/>`;
  s += line([60, 92, 2], [210, 92, 2], c, 1.8);
  for (let x = 78; x < 200; x += 18) s += `<g transform="${at(x, 84, 2)}">${O.diamond(cream, 4)}</g>`;
  s += `</g><path d="${hem}" fill="none" stroke="${ink}" stroke-width="2.6" stroke-linejoin="round"/>`;
  s += `<path d="M${p(54, 80, 2)} L${p(54, 98, 2)} C${p(54, 114, 26)} ${p(54, 114, 60)} ${p(54, 104, 80)} L${p(68, 105, 80)} C${p(68, 115, 60)} ${p(68, 115, 26)} ${p(68, 98, 2)} L${p(68, 79, 2)} Z" fill="${cream}" stroke="${ink}" stroke-width="2.4" stroke-linejoin="round"/>`;
  for (const z of [16, 40, 64]) s += `<g transform="${at(61, 111, z)}">${O.diamond(c, 3.4)}</g>`;
  // арқалық с позолоченной ручкой
  const bar = `M${p(0, 138, 42)} L${p(206, 138, 42)}`;
  s += rod(bar, 11);
  s += `<g transform="${at(102, 138, 42)}"><rect x="-15" y="-7" width="30" height="14" rx="6" fill="${c}" stroke="${ink}" stroke-width="2"/></g>`;
  // изножье (видна внешняя сторона, с толщиной доски) и узор на нём
  s += `<path d="${board(200)}" fill="${woodD}" stroke="${ink}" stroke-width="3" stroke-linejoin="round"/><path d="${board(206)}" fill="${wood}" stroke="${ink}" stroke-width="3" stroke-linejoin="round"/>`;
  s += `<g transform="${at(206, 96, 42)} matrix(${Dx} ${Dy} 0 1 0 0)"><g transform="translate(0,-8) scale(.34)">${O.horn(c, 8)}</g><g transform="translate(0,-36)">${O.diamond(c, 6)}</g><g transform="translate(0,26)">${O.diamond(c, 5)}</g></g>`;
  s += `<circle cx="${q(214, 138, 42)[0].toFixed(1)}" cy="${q(214, 138, 42)[1].toFixed(1)}" r="6.5" fill="${c}" stroke="${ink}" stroke-width="2.2"/>`;
  // ближний полоз
  s += rod(rocker(10), 11);
  return O.svg(310, 236, s);
}

// месяц-колыбель: малыш в құндақ спит в серпе месяца, висящего на нитях; облака и звёзды
function ayBesik(P, O) {
  const gold = P.accent, light = P.ink, night = P.soft;
  const swaddle = '#e7f2f4', swaddleD = '#8dbccb', skin = '#f8dcc9';
  let s = `<defs><radialGradient id="mg" cx=".5" cy=".85" r=".75"><stop offset="0" stop-color="#f8e2a6"/><stop offset="1" stop-color="${gold}"/></radialGradient>
<radialGradient id="gl"><stop offset="0" stop-color="${light}" stop-opacity=".16"/><stop offset=".6" stop-color="${light}" stop-opacity=".07"/><stop offset="1" stop-color="${light}" stop-opacity="0"/></radialGradient>
<clipPath id="sw"><path d="M110,130 C150,118 196,122 214,136 C226,146 222,166 206,172 C176,182 132,180 108,170 Z"/></clipPath></defs>`;
  s += `<circle cx="150" cy="140" r="118" fill="url(#gl)"/>`;
  // звёзды и искорки
  for (const [x, y, r] of [[36, 38, 9], [266, 58, 10], [24, 128, 5], [282, 140, 6], [88, 74, 5], [222, 92, 4], [196, 30, 5], [104, 22, 4]]) s += `<g transform="translate(${x},${y})">${O.star(gold, r, 5)}</g>`;
  for (const [x, y, r] of [[62, 104, 7], [244, 112, 7], [150, 44, 6]]) s += `<g transform="translate(${x},${y})">${O.star(light, r)}</g>`;
  for (const [x, y] of [[60, 60], [240, 30], [130, 64], [176, 70], [18, 90], [290, 96]]) s += `<circle cx="${x}" cy="${y}" r="1.8" fill="${light}" opacity=".8"/>`;
  // нити, на которых висит месяц
  s += `<path d="M62,112 L150,30 L238,112" fill="none" stroke="${light}" stroke-width="1.4" opacity=".55"/><g transform="translate(150,26)">${O.star(gold, 11, 5)}</g>`;
  // малыш: құндақ с перекрёстными тесёмками, шапочка, закрытые глазки
  s += `<g transform="translate(0,-4) rotate(5 150 150)"><path d="M110,130 C150,118 196,122 214,136 C226,146 222,166 206,172 C176,182 132,180 108,170 Z" fill="${swaddle}" stroke="${night}" stroke-width="2.4"/>
<g clip-path="url(#sw)" fill="none"><path d="M146,112 Q156,150 148,190 M186,114 Q196,150 188,190" stroke="${gold}" stroke-width="7"/><path d="M164,112 Q174,150 166,190" stroke="${swaddleD}" stroke-width="2" stroke-dasharray="2 5" stroke-linecap="round"/></g>
<g transform="translate(152,150)">${O.diamond(night, 4.5)}</g><g transform="translate(192,150)">${O.diamond(night, 4.5)}</g><circle cx="210" cy="150" r="2.6" fill="${gold}"/>
<g transform="translate(106,146)"><circle r="20" fill="${skin}" stroke="${night}" stroke-width="2.4"/><path d="M-19.4,-5 A20,20 0 0,1 19.4,-5 Z" fill="${swaddleD}" stroke="${night}" stroke-width="2"/><line x1="-19" y1="-5" x2="19" y2="-5" stroke="${gold}" stroke-width="2.6"/><circle cy="-22" r="3.6" fill="${gold}"/>
<path d="M-11,4 q4,4 8,0 M3,4 q4,4 8,0" fill="none" stroke="${night}" stroke-width="1.9" stroke-linecap="round"/><circle cx="-11" cy="11" r="3.4" fill="#f2a3a6" opacity=".8"/><circle cx="11" cy="11" r="3.4" fill="#f2a3a6" opacity=".8"/><path d="M-2.5,13 q2.5,2 5,0" fill="none" stroke="${night}" stroke-width="1.5" stroke-linecap="round"/></g></g>`;
  const cloud = (x, y, k, col, op) => `<g transform="translate(${x},${y}) scale(${k})" fill="${col}" opacity="${op}"><circle cx="0" cy="0" r="20"/><circle cx="24" cy="-10" r="25"/><circle cx="52" cy="-2" r="20"/><circle cx="-22" cy="8" r="14"/><circle cx="72" cy="8" r="13"/><rect x="-36" y="6" width="122" height="18" rx="9"/></g>`;
  // месяц (рогами вверх) с ромбами
  s += `<path d="M56,106 C56,172 100,208 150,208 C200,208 244,172 244,106 C228,150 194,172 150,172 C106,172 72,150 56,106 Z" fill="url(#mg)"/>`;
  for (const [x, y, r] of [[150, 192, 5.5], [118, 188, 4], [182, 188, 4], [92, 176, 3], [208, 176, 3]]) s += `<g transform="translate(${x},${y})">${O.diamond(night, r)}</g>`;
  // облака
  s += cloud(40, 222, 1.1, '#89b3c1', 1) + cloud(196, 226, 1, '#c6dee5', 1) + cloud(126, 229, .78, '#a7cad4', 1);
  return O.svg(300, 250, s);
}

// үкі (пучок совиных перьев) и тұмар с кистями — оберег, который вешают над бесіком; висит с вершины арки
function ukiTumar(P, O) {
  const ink = P.ink, c = P.accent, sand = P.soft, cream = '#fffbf2', bar = '#a3825a';
  // перо: светлое, с поперечными полосами и тёмным кончиком; рисуется вниз от точки крепления
  const F = 'M0,0 C15,8 19,36 14,62 C12,72 7,82 0,88 C-7,82 -12,72 -14,62 C-19,36 -15,8 0,0 Z';
  const feather = (rot, k) => `<g transform="translate(130,104) rotate(${rot}) scale(${k})"><path d="${F}" fill="${cream}"/><g clip-path="url(#fc)" fill="none" stroke-linecap="round">${[26, 44, 62].map(y => `<path d="M-20,${y} Q0,${y + 9} 20,${y}" stroke="${bar}" stroke-width="6"/>`).join('')}<path d="M-20,80 Q0,89 20,80" stroke="${ink}" stroke-width="11"/></g><path d="${F}" fill="none" stroke="${ink}" stroke-width="2.6" stroke-linejoin="round"/><path d="M0,6 L0,80" stroke="${ink}" stroke-width="2"/></g>`;
  // кисть-шашақ на углу тұмара
  const tassel = x => `<line x1="${x}" y1="100" x2="${x}" y2="120" stroke="${ink}" stroke-width="2.4"/><circle cx="${x}" cy="122" r="5.5" fill="${c}" stroke="${ink}" stroke-width="2"/><path d="M${x - 7},127 L${x - 10},156 L${x + 10},156 L${x + 7},127 Z" fill="${c}" stroke="${ink}" stroke-width="2" stroke-linejoin="round"/>${[-4.5, 0, 4.5].map(d => `<line x1="${x + d}" y1="134" x2="${x + d * 1.3}" y2="152" stroke="${ink}" stroke-width="1.5"/>`).join('')}`;
  let s = `<defs><clipPath id="fc"><path d="${F}"/></clipPath></defs>`;
  // шнур с бусиной
  s += `<line x1="130" y1="0" x2="130" y2="26" stroke="${ink}" stroke-width="2.6"/><circle cx="130" cy="12" r="5" fill="${c}" stroke="${ink}" stroke-width="2"/>`;
  // тұмар
  s += `<path d="M130,24 L194,100 L66,100 Z" fill="${sand}" stroke="${ink}" stroke-width="3.4" stroke-linejoin="round"/><path d="M130,40 L176,93 L84,93 Z" fill="none" stroke="${c}" stroke-width="2.4" stroke-linejoin="round"/>`;
  s += `<g transform="translate(130,72) scale(.3)">${O.horn(ink, 8)}</g><g transform="translate(130,55)">${O.diamond(c, 4)}</g>`;
  s += tassel(72) + tassel(188);
  // үкі — пучок перьев под тұмаром
  s += feather(24, 1) + feather(-24, 1) + feather(0, 1.2);
  s += `<path d="M119,96 L141,96 L137,112 L123,112 Z" fill="${c}" stroke="${ink}" stroke-width="2.4" stroke-linejoin="round"/>`;
  return O.svg(260, 220, s);
}

// гирлянда: флажки-тұмары с орнаментом на шнуре, между ними на нитях звёзды, в центре — месяц
function garland(P, O) {
  const ink = P.ink, c = P.accent, sand = P.soft, sage = P.button, cream = '#fffaf2', gold = '#c9973f';
  const cy = x => { const t = (x - 10) / 380; return 30 + 150 * t * (1 - t); };
  let s = '';
  // нити со звёздами (позади флажков)
  for (const [x, len, r, col] of [[76, 92, 12, gold], [136, 70, 10, c], [264, 70, 10, c], [324, 92, 12, gold]]) {
    const y0 = cy(x);
    s += `<line x1="${x}" y1="${y0}" x2="${x}" y2="${y0 + len}" stroke="${ink}" stroke-width="1.6"/><g transform="translate(${x},${y0 + len + r * .7})">${O.star(col, r * 1.5, 5)}</g>`;
  }
  { const y0 = cy(200); s += `<line x1="200" y1="${y0}" x2="200" y2="${y0 + 64}" stroke="${ink}" stroke-width="1.6"/><g transform="translate(196,${y0 + 92}) scale(.95)">${O.crescent(gold)}</g>`; }
  // шнур
  s += `<path d="M10,30 Q200,105 390,30" fill="none" stroke="${ink}" stroke-width="2.6"/>`;
  // флажки
  const flags = [[46, c, cream], [106, sand, c], [166, sage, cream], [234, sage, cream], [294, sand, c], [354, c, cream]];
  for (const [x, fill, orn] of flags) {
    const a = [x - 26, cy(x - 26)], b = [x + 26, cy(x + 26)], tip = [x, (a[1] + b[1]) / 2 + 58];
    const m = (a[1] + b[1]) / 2;
    s += `<path d="M${a} L${b} L${tip} Z" fill="${fill}" stroke="${ink}" stroke-width="2.4" stroke-linejoin="round"/>`;
    s += `<g transform="translate(${x},${m + 20}) scale(.26)">${O.horn(orn, 9)}</g><g transform="translate(${x},${m + 40})">${O.diamond(orn, 4.5)}</g>`;
  }
  // узелки на концах с кистями
  for (const x of [10, 390]) s += `<circle cx="${x}" cy="30" r="7" fill="${c}" stroke="${ink}" stroke-width="2.2"/><path d="M${x - 6},38 L${x - 8},70 L${x + 8},70 L${x + 6},38 Z" fill="${c}" stroke="${ink}" stroke-width="2" stroke-linejoin="round"/>`;
  return O.svg(400, 220, s);
}

module.exports = [
  { id: 9013, slug: 'besik-korpe', category: 'besik', layout: 'classic',
    palette: { bg: '#fcf0f2', card: '#fffafb', line: '#f0d4da', ink: '#4a3540', name: '#a24f66', accent: '#a87c35', soft: '#f8e3e7', button: '#7a5a22', buttonText: '#ffffff' },
    envelope: ['#a85d72', '#fffaf6'], style: { band: 'wave', divider: 'wave', rosette: 'horn8', heading: 'serif' },
    motif: korpe, motifW: 300, motifH: 228 },
  { id: 9014, slug: 'besik-ay', category: 'besik', layout: 'darkhero',
    palette: { bg: '#f0f5f6', card: '#fbfdfd', line: '#d2e2e6', ink: '#1d3943', name: '#174a5c', accent: '#ad853c', soft: '#e1ecef', button: '#174a5c', buttonText: '#ffffff',
      dark: '#163a4a', light: '#eaf5f7' },
    envelope: ['#163a4a', '#f0d9a0'], style: { band: 'diamond', divider: 'diamond', rosette: 'star8', heading: 'serif' },
    motif: ayBesik, motifW: 290, motifH: 242 },
  { id: 9015, slug: 'besik-uki', category: 'besik', layout: 'arch',
    palette: { bg: '#edf6f1', card: '#fbfefc', line: '#cfe4d8', ink: '#26443b', name: '#2a6050', accent: '#a07a45', soft: '#efe4cd', button: '#2f6a59', buttonText: '#ffffff' },
    envelope: ['#3f7a66', '#fffaf0'], style: { band: 'tumar', divider: 'tumar', rosette: 'flower', heading: 'serif' },
    motif: ukiTumar, motifW: 130, motifH: 110 },
  { id: 9016, slug: 'besik-shoq', category: 'besik', layout: 'medallion',
    palette: { bg: '#fbf5ee', card: '#fffbf6', line: '#ecd8c8', ink: '#45291f', name: '#a3482e', accent: '#b5573a', soft: '#f3e1d1', button: '#52705a', buttonText: '#ffffff' },
    envelope: ['#a04a30', '#fff3e8'], style: { band: 'horn', divider: 'horn', rosette: 'horn8', heading: 'caps' },
    motif: garland, motifW: 200, motifH: 110 },
];
