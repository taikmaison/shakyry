// Первые четыре своих шаблона: #9001 тұсаукесер, #9002 ас беру, #9003 бесік той, #9004 сүндет той.
// Формат описания — own/README.md.

// тұсаукесер: ала жіп — витой чёрно-белый шнур, перерезанный посередине; три стопы (левая-правая-левая) идут вверх от разреза
function tusau(P, O) {
  let rope = '';
  const Y = 176, bead = (x, i) => `<ellipse cx="${x}" cy="${Y}" rx="9" ry="5.2" transform="rotate(-38 ${x} ${Y})" fill="${i % 2 ? P.card : P.ink}" stroke="${P.ink}" stroke-width="1.2"/>`;
  for (let i = 0, x = 16; x <= 126; i++, x += 9) rope += bead(x, i);
  for (let i = 0, x = 184; x <= 294; i++, x += 9) rope += bead(x, i + 1);
  rope += `<g fill="none" stroke="${P.ink}" stroke-width="1.3" stroke-linecap="round"><path d="M134,173 q7,-3 11,-10 M135,176 q7,0 12,-2 M134,179 q7,3 11,9"/><path d="M176,173 q-7,-3 -11,-10 M175,176 q-7,0 -12,-2 M176,179 q-7,3 -11,9"/></g>`;
  const c = P.accent;
  const foot = (x, y, a, flip) => `<g transform="translate(${x},${y}) rotate(${a}) scale(${flip ? -1.4 : 1.4},1.4)"><path d="M1,16 C-4,16 -6,11 -5,5 C-4,0 -7,-6 -5,-11 C-3,-15 3,-16 6,-12 C9,-8 8,-2 6,3 C5,8 6,16 1,16 Z" fill="${c}"/>${[[-3, -19, 3], [1.6, -20.6, 2.3], [5, -19.2, 2], [7.6, -16.6, 1.75], [9.2, -13.2, 1.5]].map(([dx, dy, r]) => `<circle cx="${dx}" cy="${dy}" r="${r}" fill="${c}"/>`).join('')}</g>`;
  const steps = foot(139, 142, -8, 1) + foot(171, 90, 8, 0) + foot(139, 38, -8, 1);
  return O.svg(310, 200, `${steps}${rope}<g transform="translate(155,194)">${O.diamond(c, 4)}</g>`);
}

// бесік (колыбель) сбоку: торцевые доски, перекладина-арқалық, полозья, орнамент; над ней месяц и звёзды
function besik(P, O) {
  const c = P.accent, ink = P.ink, soft = P.soft;
  return O.svg(280, 240, `
<path d="M196,18 a26,26 0 1,0 30,30 a20,20 0 1,1 -30,-30 Z" fill="${c}"/><g transform="translate(70,34)">${O.star(c, 8)}</g><g transform="translate(106,16)">${O.star(c, 5)}</g><g transform="translate(250,110)">${O.star(c, 5)}</g><g transform="translate(30,92)">${O.star(c, 4)}</g>
<path d="M22,200 Q140,250 258,200" fill="none" stroke="${ink}" stroke-width="7" stroke-linecap="round"/>
<path d="M58,128 L222,128 L214,186 Q140,200 66,186 Z" fill="${soft}" stroke="${ink}" stroke-width="3.5" stroke-linejoin="round"/>
<rect x="38" y="86" width="22" height="128" rx="9" fill="${soft}" stroke="${ink}" stroke-width="3.5"/><rect x="220" y="86" width="22" height="128" rx="9" fill="${soft}" stroke="${ink}" stroke-width="3.5"/>
<path d="M49,92 Q140,70 231,92" fill="none" stroke="${ink}" stroke-width="7" stroke-linecap="round"/><rect x="126" y="76" width="28" height="10" rx="5" fill="${c}"/>
<g transform="translate(140,160) scale(.5)">${O.horn(c, 7)}</g><g transform="translate(96,160) scale(.3)">${O.horn(c, 8)}</g><g transform="translate(184,160) scale(.3)">${O.horn(c, 8)}</g>`);
}

// шаңырақ (как на гербе): кольцо с уықтарами, изогнутые күлдіреуіштер
function shanyrak(P, O) {
  const c = P.ink, c2 = P.accent;
  let s = '<g transform="translate(130,130)">';
  for (let a = 0; a < 360; a += 7.5) s += `<line x1="0" y1="-90" x2="0" y2="${a % 15 ? -114 : -127}" stroke="${c2}" stroke-width="${a % 15 ? 1.4 : 2.2}" stroke-linecap="round" transform="rotate(${a})"/>`;
  s += `<circle r="84" fill="none" stroke="${c}" stroke-width="5"/><circle r="76" fill="none" stroke="${c2}" stroke-width="1.2"/><clipPath id="in"><circle r="74"/></clipPath><g clip-path="url(#in)" fill="none" stroke="${c2}" stroke-width="3" stroke-linecap="round">`;
  for (const d of [-27, 0, 27]) s += `<path d="M-84,${d * 1.1} Q0,${d * 0.55} 84,${d * 1.1}"/><path d="M${d * 1.1},-84 Q${d * 0.55},0 ${d * 1.1},84"/>`;
  s += `</g>`;
  return O.svg(260, 260, s + '</g>');
}

// сүндет: розетка, внутри месяц со звездой
const sundetRosette = (P, O) => O.rosettes.horn8(P.ink, P.accent, `<circle r="40" fill="#ffffff" stroke="${P.accent}" stroke-width="2"/><g transform="translate(-6,0)">${O.crescent(P.accent)}</g>`);

module.exports = [
  { id: 9001, slug: 'tusau', category: 'tusaukeser', layout: 'classic',
    palette: { bg: '#f7f3ea', card: '#fffdf8', line: '#dccfb0', ink: '#2e3b33', name: '#2e4a3e', accent: '#a87d2c', soft: '#efe5cf', button: '#2e4a3e', buttonText: '#fbf4e2' },
    envelope: ['#2e4a3e', '#f3e7c8'], motif: tusau, motifW: 300, motifH: 194 },
  { id: 9002, slug: 'as', category: 'as_beru', layout: 'classic', calm: true, marker: 'circle', music: null, wishes: false, timer: null,
    palette: { bg: '#f2f0eb', card: '#fbfaf7', line: '#d6d0c2', ink: '#2b2f33', name: '#2b2f33', accent: '#7a6844', soft: '#e3ded2', button: '#3a4046', buttonText: '#f2ede1' },
    envelope: ['#2f3439', '#e9e1cc'], motif: shanyrak, motifW: 230, motifH: 230,
    dateTitle: 'Ас беру күні', hostsTitle: 'Ас иелері',
    rsvpTitle: 'Келетініңізді растаңыз', rsvp: ['Иә, барамын', 'Өкінішке орай, келе алмаймын'], footer: 'Жатқан жері жайлы болсын' },
  { id: 9003, slug: 'besik', category: 'besik', layout: 'bordered',
    palette: { bg: '#f4f7fb', card: '#ffffff', line: '#cfdbe9', ink: '#33465c', name: '#2f4f73', accent: '#b88a3a', soft: '#e3ecf6', button: '#3d5f86', buttonText: '#ffffff' },
    envelope: ['#4a6f97', '#ffffff'], motif: besik, motifW: 250, motifH: 214, style: { band: 'wave', divider: 'diamond', rosette: 'flower', heading: 'caps' } },
  { id: 9004, slug: 'sundet', category: 'sundet', layout: 'classic',
    palette: { bg: '#f3f5f9', card: '#ffffff', line: '#cfd7e6', ink: '#1f3456', name: '#1f3a63', accent: '#b8902f', soft: '#e4e9f3', button: '#1f3a63', buttonText: '#f6e7bf' },
    envelope: ['#1f3a63', '#f0dca8'], motif: sundetRosette, motifW: 230, motifH: 230, marker: 'circle', style: { rosette: 'star8' } },
];
