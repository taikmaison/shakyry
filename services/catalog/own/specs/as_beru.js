// Ас беру — три спокойных шаблона: #9010 мешіт (тёмная шапка, тёмно-зелёный), #9011 тәспі (арка, тёмно-синий),
// #9012 рехал с раскрытой книгой (медальон, графит и бронза). Без музыки, пожеланий и отсчёта, розетка не вращается.
// Формат описания — own/README.md. Все рисунки — свои, из кода.

const AS = {
  category: 'as_beru', calm: true, music: null, wishes: false, timer: null, marker: 'circle',
  dateTitle: 'Ас беру күні', hostsTitle: 'Ас иелері',
  rsvpTitle: 'Келетініңізді растаңыз', rsvp: ['Иә, барамын', 'Өкінішке орай, келе алмаймын'],
};

// месяц: внешний круг r, вырез сдвинут вправо-вверх (центр около 0,0)
const moon = (c, r, k = .8) => `<path d="M${(r * .35).toFixed(1)},${(-r * .94).toFixed(1)} A${r},${r} 0 1,0 ${(r * .35).toFixed(1)},${(r * .94).toFixed(1)} A${(r * k).toFixed(1)},${(r * k).toFixed(1)} 0 1,1 ${(r * .35).toFixed(1)},${(-r * .94).toFixed(1)} Z" fill="${c}"/>`;

// мешіт: купол-луковица с месяцем на шпиле, портал-айван со стрельчатой дверью, два минарета, боковые купола; в небе месяц и звёзды
function meshit(P, O) {
  const c = P.ink, a = P.accent, f = P.soft, sw = 3;
  const st = `stroke="${c}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"`;
  const glow = `fill="${a}" fill-opacity=".38"`;
  const arch = (x, y, w, h) => `M${x - w / 2},${y + h} L${x - w / 2},${y + w * .55} C${x - w / 2},${y + w * .2} ${x - w * .15},${y + w * .08} ${x},${y} C${x + w * .15},${y + w * .08} ${x + w / 2},${y + w * .2} ${x + w / 2},${y + w * .55} L${x + w / 2},${y + h} Z`;
  const minaret = x => `
<path d="M${x - 8},204 L${x - 6},100 L${x + 6},100 L${x + 8},204 Z" fill="${f}" ${st}/>
<path d="M${x - 12},100 L${x + 12},100 L${x + 9},92 L${x - 9},92 Z" fill="${f}" ${st}/>
<path d="M${x - 5},92 L${x - 5},68 L${x + 5},68 L${x + 5},92" fill="${f}" ${st}/>
<path d="M${x - 8},68 L${x + 8},68 M${x - 6},68 C${x - 6},58 ${x - 2},52 ${x},44 C${x + 2},52 ${x + 6},58 ${x + 6},68" fill="${f}" ${st}/>
<line x1="${x}" y1="44" x2="${x}" y2="36" stroke="${a}" stroke-width="2.4" stroke-linecap="round"/><circle cx="${x}" cy="34" r="2.6" fill="${a}"/>
<line x1="${x - 7}" y1="150" x2="${x + 7}" y2="150" stroke="${a}" stroke-width="2"/><line x1="${x - 6.5}" y1="124" x2="${x + 6.5}" y2="124" stroke="${a}" stroke-width="2"/>
<path d="${arch(x, 164, 6, 18)}" ${glow}/>`;
  const sideDome = x => `<path d="M${x - 16},204 L${x - 16},164 L${x + 16},164 L${x + 16},204" fill="${f}" ${st}/>
<path d="M${x - 14},164 C${x - 16},152 ${x - 8},144 ${x},138 C${x + 8},144 ${x + 16},152 ${x + 14},164 Z" fill="${f}" ${st}/>
<path d="${arch(x, 176, 10, 18)}" ${glow}/>`;
  let s = '';
  // небо: месяц и звёзды
  s += `<g transform="translate(200,44)">${moon(a, 15)}</g>`;
  s += `<g transform="translate(78,34)">${O.star(a, 6, 4)}</g><g transform="translate(102,70)">${O.star(a, 3.5, 4)}</g><g transform="translate(176,26)">${O.star(a, 3.5, 4)}</g><g transform="translate(220,98)">${O.star(a, 4, 4)}</g><g transform="translate(64,104)">${O.star(a, 3, 4)}</g>`;
  s += minaret(40) + minaret(240) + sideDome(76) + sideDome(204);
  // центральный корпус и барабан
  s += `<rect x="92" y="138" width="96" height="66" fill="${f}" ${st}/><rect x="100" y="124" width="80" height="14" fill="${f}" ${st}/>`;
  s += [110, 125, 140, 155, 170].map(x => `<path d="${arch(x, 127, 5, 8)}" ${glow}/>`).join('');
  // купол
  s += `<path d="M100,124 C88,104 104,86 124,74 C134,68 139,60 140,50 C141,60 146,68 156,74 C176,86 192,104 180,124 Z" fill="${f}" ${st}/>`;
  s += `<path d="M118,121 C112,106 122,92 134,82" fill="none" stroke="${a}" stroke-width="2" stroke-linecap="round" opacity=".8"/>`;
  s += `<line x1="140" y1="50" x2="140" y2="32" stroke="${a}" stroke-width="2.6" stroke-linecap="round"/><circle cx="140" cy="42" r="3.2" fill="${a}"/><g transform="translate(138,20) rotate(-20)">${moon(a, 9, .78)}</g>`;
  // портал-айван и окна
  s += `<rect x="116" y="146" width="48" height="58" fill="none" stroke="${c}" stroke-width="2.2"/>`;
  s += `<path d="${arch(140, 158, 28, 46)}" fill="${a}" fill-opacity=".38" ${st}/><g transform="translate(140,152)">${O.diamond(a, 3.2)}</g>`;
  s += `<path d="${arch(104, 160, 10, 22)}" ${glow} stroke="${c}" stroke-width="2"/><path d="${arch(176, 160, 10, 22)}" ${glow} stroke="${c}" stroke-width="2"/>`;
  // земля
  s += `<line x1="8" y1="205" x2="272" y2="205" stroke="${c}" stroke-width="${sw}" stroke-linecap="round"/>`;
  s += [20, 60, 100, 180, 220, 260].map(x => `<g transform="translate(${x},214)">${O.diamond(a, 3)}</g>`).join('');
  return O.svg(280, 220, s);
}

// тәспі: овал из бусин с двумя бусинами-разделителями; внизу нить сходится к имаме (длинной бусине) и кисточке; внутри — месяц
function taspi(P, O) {
  const c = P.ink, a = P.accent, t = P.sand || a;
  const cx = 130, cy = 88, RX = 84, RY = 60, gap = 22, N = 31;
  let s = `<defs><radialGradient id="b" cx=".35" cy=".32" r=".75"><stop offset="0" stop-color="#ffffff" stop-opacity=".55"/><stop offset=".45" stop-color="#ffffff" stop-opacity="0"/></radialGradient></defs>`;
  const pts = [];
  for (let i = 0; i < N; i++) {
    const ang = (90 + gap + i * (360 - 2 * gap) / (N - 1)) * Math.PI / 180;
    pts.push([cx + RX * Math.cos(ang), cy + RY * Math.sin(ang)]);
  }
  const f = v => v.toFixed(1), [p0, p1] = [pts[0], pts[N - 1]];
  // нить
  s += `<path d="M${f(p0[0])},${f(p0[1])} A${RX},${RY} 0 1,1 ${f(p1[0])},${f(p1[1])}" fill="none" stroke="${c}" stroke-width="1.4"/>`;
  s += `<path d="M${f(p0[0])},${f(p0[1])} L${cx},160 L${f(p1[0])},${f(p1[1])}" fill="none" stroke="${c}" stroke-width="1.8"/>`;
  pts.forEach(([x, y], i) => {
    const sep = i === 10 || i === 20, r = sep ? 8.6 : 7;
    s += `<circle cx="${f(x)}" cy="${f(y)}" r="${r}" fill="${sep ? t : c}"/><circle cx="${f(x)}" cy="${f(y)}" r="${r}" fill="url(#b)"/>`;
  });
  // имаме и кисточка
  s += `<circle cx="${cx}" cy="161" r="7.5" fill="${t}"/><circle cx="${cx}" cy="161" r="7.5" fill="url(#b)"/>`;
  const im = `M${cx - 5},168 C${cx - 9},175 ${cx - 8},184 ${cx - 5},190 L${cx + 5},190 C${cx + 8},184 ${cx + 9},175 ${cx + 5},168 Z`;
  s += `<path d="${im}" fill="${c}"/><path d="${im}" fill="url(#b)"/><rect x="${cx - 6}" y="190" width="12" height="5" rx="2" fill="${t}"/>`;
  let fr = '';
  for (let k = -6; k <= 6; k++) fr += `<path d="M${cx + k * .7},195 Q${cx + k * 1.8},205 ${cx + k * 2.9},217"/>`;
  s += `<g fill="none" stroke="${t}" stroke-width="1.8" stroke-linecap="round">${fr}</g>`;
  s += `<g transform="translate(${cx - 5},${cy - 2})">${moon(a, 20, .8)}</g><g transform="translate(${cx + 20},${cy - 14})">${O.star(a, 5, 4)}</g>`;
  return O.svg(260, 220, s);
}

// рехал (кітап тұғыры) — скрещённые доски, на нём раскрытая книга со строками
function rehal(P, O) {
  const c = P.ink, a = P.accent, pg = P.card, sw = 2.6;
  let s = '';
  // доски крестом
  const board = (x1, y1, x2, y2) => {
    const dx = x2 - x1, dy = y2 - y1, l = Math.hypot(dx, dy), nx = -dy / l * 8, ny = dx / l * 8;
    return `<path d="M${(x1 + nx).toFixed(1)},${(y1 + ny).toFixed(1)} L${(x2 + nx).toFixed(1)},${(y2 + ny).toFixed(1)} L${(x2 - nx).toFixed(1)},${(y2 - ny).toFixed(1)} L${(x1 - nx).toFixed(1)},${(y1 - ny).toFixed(1)} Z" fill="${a}" stroke="${c}" stroke-width="2" stroke-linejoin="round"/>`;
  };
  s += board(112, 138, 284, 212) + board(288, 138, 116, 212);
  s += `<circle cx="200" cy="175" r="6" fill="${c}"/><circle cx="200" cy="175" r="2.4" fill="${a}"/>`;
  // обложка
  s += `<path d="M200,92 C166,74 112,70 58,80 L52,150 C110,142 166,146 200,164 C234,146 290,142 348,150 L342,80 C288,70 234,74 200,92 Z" fill="${c}" stroke="${c}" stroke-width="${sw}" stroke-linejoin="round"/>`;
  // страницы
  const pageL = 'M200,84 C168,66 116,62 68,70 L62,140 C114,132 166,136 200,154 Z';
  s += `<path d="${pageL}" fill="${pg}" stroke="${c}" stroke-width="${sw}" stroke-linejoin="round"/><path d="${pageL}" transform="translate(400,0) scale(-1,1)" fill="${pg}" stroke="${c}" stroke-width="${sw}" stroke-linejoin="round"/>`;
  let lines = '';
  for (let i = 0; i < 6; i++) {
    const d = i * 9.4;
    lines += `<path d="M188,${(96 + d).toFixed(1)} C162,${(83 + d).toFixed(1)} 120,${(80 + d * .96).toFixed(1)} 82,${(85 + d * .92).toFixed(1)}"/>`;
  }
  s += `<g fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-dasharray="14 3 6 3 22 3 8 3" opacity=".45">${lines}<g transform="translate(400,0) scale(-1,1)">${lines}</g></g>`;
  s += `<line x1="200" y1="84" x2="200" y2="154" stroke="${c}" stroke-width="1.6"/>`;
  // над книгой — месяц и звёзды
  s += `<g transform="translate(200,34)">${moon(a, 15, .8)}</g><g transform="translate(160,44)">${O.star(a, 4, 4)}</g><g transform="translate(244,40)">${O.star(a, 5, 4)}</g>`;
  return O.svg(400, 220, s);
}

module.exports = [
  { ...AS, id: 9010, slug: 'as-meshit', layout: 'darkhero',
    palette: { bg: '#eef2ee', card: '#fafcf9', line: '#c7d3c9', ink: '#22332c', name: '#1e3b31', accent: '#9a8152', soft: '#dfe7df',
      button: '#1e3b31', buttonText: '#efe7d2', dark: '#1a3029', light: '#ede5cf' },
    envelope: ['#1e3b31', '#e9dcb8'], style: { band: 'tumar', divider: 'tumar', rosette: 'flower', heading: 'serif' },
    motif: meshit, motifW: 280, motifH: 220, footer: 'Иманды болсын' },
  { ...AS, id: 9011, slug: 'as-taspi', layout: 'arch',
    palette: { bg: '#eef1f5', card: '#fafbfd', line: '#c9d1dd', ink: '#263247', name: '#1f2d4a', accent: '#5e7192', soft: '#dfe5ee',
      button: '#263a5c', buttonText: '#f1ead8', sand: '#a88f62' },
    envelope: ['#263a5c', '#e8dfc6'], style: { band: 'diamond', divider: 'diamond', rosette: 'horn8', heading: 'caps' },
    motif: taspi, motifW: 130, motifH: 110, footer: 'Жаны жәннатта болсын' },
  { ...AS, id: 9012, slug: 'as-rehal', layout: 'medallion',
    palette: { bg: '#f0e9dd', card: '#fbf8f2', line: '#d8ccb6', ink: '#2f2c2a', name: '#2f2c2a', accent: '#8a6a45', soft: '#e8decb',
      button: '#2f2c2a', buttonText: '#f1e6cf' },
    envelope: ['#34312d', '#e6d6b4'], style: { band: 'wave', divider: 'horn', rosette: 'star8', heading: 'caps' },
    motif: rehal, motifW: 200, motifH: 110, footer: 'Топырағы торқа болсын' },
];
