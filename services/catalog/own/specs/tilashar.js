// Тілашар (#9025–#9027): ребёнок начинает учиться грамоте. Рисунки — свои, SVG из кода.
// Формат описания — own/README.md.

// буквы штрихами (рисуем сами, без шрифтов): поле 60×80
const LET = {
  'А': 'M5,79 L30,2 L55,79 M14,53 L46,53',
  'Ә': 'M8,15 C14,6 22,2 31,2 C47,2 57,18 57,40 C57,64 45,79 30,79 C15,79 4,66 4,44 L57,44',
  'Б': 'M52,2 L8,2 L8,79 L30,79 C46,79 54,70 54,57 C54,44 46,36 30,36 L8,36',
};
const letter = (ch, x, y, s, c, sw = 7) => `<path d="${LET[ch]}" transform="translate(${x},${y}) scale(${s})" fill="none" stroke="${c}" stroke-width="${(sw / s).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"/>`;

// қаламұш — гусиное перо: остриё в (0,0), перо вверх (длина ~175); c — опахало, ink — стержень и пёрышко, cut — прорези
const quill = (c, ink, cut) => `
<path d="M0,-36 C-15,-62 -22,-108 -15,-150 C-11,-165 -4,-172 2,-176 C10,-158 15,-120 13,-80 C12,-58 6,-44 0,-36 Z" fill="${c}"/>
<g stroke="${cut}" stroke-width="2.2" stroke-linecap="round" fill="none"><path d="M0,-44 L0,-164"/><path d="M-1,-70 L-14,-84 M-1,-100 L-18,-116 M-1,-130 L-14,-146 M1,-84 L12,-96 M1,-114 L13,-128"/></g>
<path d="M0,-4 L0,-40" stroke="${ink}" stroke-width="3.2" stroke-linecap="round"/>
<path d="M0,3 L-4.5,-9 L-4.5,-20 L4.5,-20 L4.5,-9 Z" fill="${ink}"/><path d="M0,1 L0,-11" stroke="${cut}" stroke-width="1.2"/><circle cx="0" cy="-13" r="1.8" fill="${cut}"/>`;

// #9025: раскрытая книга, на левой странице «Ә Б», на правой — строчки и перо, которое их пишет
function bookQuill(P, O) {
  const c = P.accent, ink = P.ink, pg = P.card, soft = P.soft;
  const page = (x, dy, fill, sw) => `<path d="M160,${64 + dy} C128,${48 + dy} ${x + 48},${44 + dy} ${x},${56 + dy} L${x},${166 + dy} C${x + 48},${154 + dy} 128,${158 + dy} 160,${174 + dy} Z" fill="${fill}" stroke="${ink}" stroke-width="${sw}" stroke-linejoin="round"/>`;
  const half = page(16, 8, soft, 1.6) + page(20, 4, pg, 1.6) + page(24, 0, pg, 2.6);
  const lines = [88, 106, 124].map(y => `<path d="M178,${y + 4} C204,${y - 2} 248,${y - 4} 280,${y - 2}" fill="none" stroke="${ink}" stroke-opacity=".35" stroke-width="3" stroke-linecap="round" stroke-dasharray="20 7 12 7 26 7 14 7"/>`).join('')
    + `<path d="M178,146 C192,142 206,140 216,139" fill="none" stroke="${ink}" stroke-opacity=".35" stroke-width="3" stroke-linecap="round" stroke-dasharray="20 7 12 7"/>`;
  return O.svg(320, 205, `
<g transform="translate(26,30)">${O.star(c, 8)}</g><g transform="translate(58,14)">${O.star(c, 5)}</g><g transform="translate(96,26)">${O.star(c, 6)}</g>
<path d="M10,72 L10,182 C66,170 126,174 160,192 C194,174 254,170 310,182 L310,72 C254,62 200,64 160,80 C120,64 66,62 10,72 Z" fill="${ink}"/>
<path d="M155,184 L155,203 L160,198 L165,203 L165,184 Z" fill="${c}"/>
${half}<g transform="translate(320,0) scale(-1,1)">${half}</g>
<path d="M160,64 L160,174" stroke="${ink}" stroke-width="2"/>
${letter('Ә', 44, 84, .62, c, 7)}${letter('Б', 98, 84, .62, c, 7)}
<g transform="translate(92,148)">${O.diamond(c, 4)}</g><g transform="translate(74,148)">${O.diamond(ink, 2.6)}</g><g transform="translate(110,148)">${O.diamond(ink, 2.6)}</g>
${lines}
<g transform="translate(224,140) rotate(33) scale(.82)">${quill(c, ink, pg)}</g>`);
}

// #9026: буквы «Ә» и «Б» в узорной рамке под рогами (внутри арки — рисунок узкий сверху)
function alipFrame(P, O) {
  const c = P.accent, ink = P.ink, nm = P.name, card = P.card, soft = P.soft;
  return O.svg(260, 220, `
<g transform="translate(130,40)">${O.star(c, 20)}</g><g transform="translate(98,50)">${O.diamond(ink, 4)}</g><g transform="translate(162,50)">${O.diamond(ink, 4)}</g>
<rect x="30" y="66" width="200" height="146" rx="22" fill="${soft}" stroke="${c}" stroke-width="5"/>
<rect x="42" y="78" width="176" height="122" rx="14" fill="${card}" stroke="${c}" stroke-width="2"/>
${[[30, 66], [230, 66], [30, 212], [230, 212]].map(([x, y]) => `<g transform="translate(${x},${y})">${O.diamond(ink, 7)}</g>`).join('')}
${letter('Ә', 54, 98, 1, nm, 12)}${letter('Б', 148, 98, 1, nm, 12)}`);
}

// #9027: чернильница с орнаментом, в ней перо; из чернильницы взлетают буквы «А», «Ә», «Б» и звёзды
function inkwell(P, O) {
  const c = P.accent, ink = P.ink, soft = P.soft;
  const trail = `<path d="M116,104 C132,98 138,84 150,78 C164,70 170,54 180,46 C192,36 196,22 206,12" fill="none" stroke="${c}" stroke-width="2.4" stroke-linecap="round" stroke-dasharray="1 8"/>`;
  return O.svg(260, 212, `
<g transform="translate(100,132) rotate(-27) scale(.84)">${quill(c, ink, soft)}</g>
<path d="M58,206 C40,206 34,192 36,176 C38,154 56,142 80,138 L80,126 L74,126 L74,110 L118,110 L118,126 L112,126 L112,138 C136,142 154,154 156,176 C158,192 152,206 134,206 Z" fill="${soft}" stroke="${ink}" stroke-width="3.5" stroke-linejoin="round"/>
<rect x="74" y="110" width="44" height="9" fill="${c}"/>
<g transform="translate(96,172) scale(.46)">${O.horn(c, 7)}</g><g transform="translate(96,194)">${O.diamond(c, 4)}</g>
<g transform="translate(60,182)">${O.diamond(ink, 3)}</g><g transform="translate(132,182)">${O.diamond(ink, 3)}</g>
${trail}
${letter('А', 158, 108, .42, ink, 5)}${letter('Ә', 188, 60, .5, ink, 5.5)}${letter('Б', 218, 8, .56, ink, 6)}
<g transform="translate(140,56)">${O.star(c, 6)}</g><g transform="translate(214,140)">${O.star(c, 7)}</g><g transform="translate(246,104)">${O.star(c, 5)}</g><g transform="translate(176,18)">${O.star(c, 4)}</g>`);
}

module.exports = [
  { id: 9025, slug: 'tilashar-kitap', category: 'tilashar', layout: 'classic', marker: 'circle',
    palette: { bg: '#f6f0e6', card: '#fffaf2', line: '#e3d4bd', ink: '#24464a', name: '#1d5258', accent: '#bc5c2b', soft: '#f2e3cc', button: '#1d5258', buttonText: '#fff3e2' },
    envelope: ['#1d5258', '#f6dcc0'], style: { band: 'diamond', divider: 'diamond', rosette: 'flower', heading: 'caps' },
    motif: bookQuill, motifW: 320, motifH: 205 },
  { id: 9026, slug: 'tilashar-alip', category: 'tilashar', layout: 'arch',
    palette: { bg: '#f6f0f3', card: '#fffbfc', line: '#e3d0da', ink: '#40283f', name: '#62305c', accent: '#a8792a', soft: '#f1e3ec', button: '#62305c', buttonText: '#fff2d8' },
    envelope: ['#62305c', '#f6dfb0'], style: { band: 'wave', divider: 'wave', rosette: 'horn8', heading: 'caps' },
    motif: alipFrame, motifW: 130, motifH: 110 },
  { id: 9027, slug: 'tilashar-siya', category: 'tilashar', layout: 'darkhero', marker: 'circle',
    palette: { bg: '#f1f3ee', card: '#fcfdf9', line: '#d2d9cc', ink: '#26352f', name: '#22403a', accent: '#c0912f', soft: '#e4eadf', button: '#22403a', buttonText: '#f7e9bf',
      dark: '#22403a', light: '#f4efdf' },
    envelope: ['#22403a', '#f1dfa8'], style: { band: 'horn', divider: 'horn', rosette: 'star8', heading: 'serif' },
    motif: inkwell, motifW: 260, motifH: 212 },
];
