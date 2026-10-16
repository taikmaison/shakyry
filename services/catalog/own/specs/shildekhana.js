// Шілдехана (#9028–#9030): праздник в честь рождения малыша. Рисунки — свои, SVG из кода.
// Формат описания — own/README.md.

// #9028: пара детских пинеток (мәсі) носками друг к другу, с бантиками и рогом на боку; между ними звёздочка
function booties(P, O) {
  const c = P.accent, ink = P.ink, nm = P.name, soft = P.soft, card = P.card;
  const one = `
<path d="M30,50 L96,50 C98,62 102,70 114,74 C148,76 172,96 172,122 C172,146 154,158 128,158 L46,158 C14,158 2,138 6,112 C10,88 24,74 30,50 Z" fill="${soft}" stroke="${ink}" stroke-width="5" stroke-linejoin="round"/>
<path d="M22,156 L150,156" stroke="${nm}" stroke-width="10" stroke-linecap="round"/>
<path d="M20,22 C46,14 82,14 106,22 L104,54 C80,60 46,60 22,54 Z" fill="${card}" stroke="${ink}" stroke-width="5" stroke-linejoin="round"/>
<g stroke="${nm}" stroke-width="3.5" stroke-linecap="round">${[34, 48, 63, 78, 92].map(x => `<path d="M${x},${26} L${x},${51}"/>`).join('')}</g>
<g transform="translate(58,124) scale(.42)">${O.horn(c, 9)}</g>
<g fill="none" stroke="${nm}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"><path d="M116,80 C102,60 86,70 104,84 Z"/><path d="M116,80 C134,62 148,74 128,86 Z"/><path d="M114,84 L106,106 M118,84 L128,104"/></g><circle cx="116" cy="81" r="7" fill="${c}" stroke="${nm}" stroke-width="3"/>`;
  return O.svg(400, 220, `
<g transform="translate(14,32)">${one}</g><g transform="translate(386,32) scale(-1,1)">${one}</g>
<g transform="translate(200,46)">${O.star(c, 16)}</g><g transform="translate(176,18)">${O.star(c, 7)}</g><g transform="translate(226,16)">${O.star(c, 8)}</g>`);
}

// #9029: детская погремушка (сылдырмақ) с орнаментом, бантом и кольцом; вокруг — «звенящие» дуги и звёзды
function rattle(P, O) {
  const c = P.accent, ink = P.ink, nm = P.name, soft = P.soft, card = P.card;
  let beads = '';
  for (let k = 0; k < 12; k++) beads += `<circle cx="0" cy="-50" r="4" fill="${k % 2 ? c : nm}" transform="rotate(${k * 30})"/>`;
  const toy = `
<circle cx="0" cy="134" r="28" fill="none" stroke="${nm}" stroke-width="10"/>
<rect x="-12" y="10" width="24" height="98" rx="12" fill="${soft}" stroke="${ink}" stroke-width="4.5"/>
${[34, 58, 82].map(y => `<path d="M-11,${y} L11,${y}" stroke="${c}" stroke-width="5" stroke-linecap="round"/>`).join('')}
<g transform="translate(0,-70)"><circle r="64" fill="${soft}" stroke="${ink}" stroke-width="5"/><circle r="50" fill="none" stroke="${c}" stroke-width="2" stroke-dasharray="2 7"/>${beads}
<circle r="38" fill="${card}" stroke="${c}" stroke-width="3"/><g transform="translate(0,4) scale(.5)">${O.horn(nm, 9)}</g><g transform="translate(0,26)">${O.diamond(c, 5)}</g></g>
<g transform="translate(0,4)"><path d="M0,0 C-20,-16 -40,-6 -28,10 C-20,20 -8,10 0,0 Z M0,0 C20,-16 40,-6 28,10 C20,20 8,10 0,0 Z" fill="${c}" stroke="${ink}" stroke-width="3" stroke-linejoin="round"/><path d="M-4,4 L-16,30 M4,4 L16,30" stroke="${c}" stroke-width="6" stroke-linecap="round"/><circle r="7" fill="${nm}" stroke="${ink}" stroke-width="3"/></g>`;
  const arcs = `<g fill="none" stroke="${c}" stroke-width="5" stroke-linecap="round"><path d="M-84,-100 C-96,-82 -96,-58 -84,-40"/><path d="M-100,-110 C-116,-84 -116,-56 -100,-30"/><path d="M84,-100 C96,-82 96,-58 84,-40"/><path d="M100,-110 C116,-84 116,-56 100,-30"/></g>`;
  return O.svg(250, 230, `
<g transform="translate(120,108) rotate(-24) scale(.68)">${arcs}${toy}</g>
<g transform="translate(206,40)">${O.star(c, 9)}</g><g transform="translate(32,46)">${O.star(c, 7)}</g><g transform="translate(222,170)">${O.star(c, 6)}</g><g transform="translate(36,196)">${O.star(nm, 5)}</g>`);
}

// #9030: малыш в қундақ (пелёнке с лентой) спит в золотом месяце; с рога месяца свисает тұмар; вокруг звёзды
function moonBaby(P, O) {
  const c = P.accent, ink = P.ink, dk = P.soft;
  const baby = `
<path d="M-62,-24 C-20,-36 40,-32 68,-14 C84,-4 82,16 62,22 C30,32 -30,32 -64,22 C-88,14 -88,-20 -62,-24 Z" fill="${ink}" stroke="${dk}" stroke-width="3"/>
<path d="M2,-31 C8,-10 8,10 2,29 L18,29 C24,10 24,-10 18,-31 Z" fill="${c}"/><g transform="translate(10,0)">${O.diamond(dk, 5)}</g>
<circle cx="-52" cy="-2" r="20" fill="#f3d6bd"/><path d="M-74,-2 C-74,-28 -30,-30 -30,-4" fill="none" stroke="${c}" stroke-width="5" stroke-linecap="round"/>
<path d="M-62,-4 q4,4 8,0 M-48,-4 q4,4 8,0" fill="none" stroke="#6b4a3a" stroke-width="2" stroke-linecap="round"/><circle cx="-60" cy="6" r="3.5" fill="#eaa38f"/><circle cx="-40" cy="6" r="3.5" fill="#eaa38f"/>
<path d="M-53,10 q3,2 6,0" fill="none" stroke="#6b4a3a" stroke-width="1.8" stroke-linecap="round"/>`;
  return O.svg(290, 222, `
<defs><mask id="cm"><circle cx="130" cy="118" r="94" fill="#fff"/><circle cx="145.4" cy="84.9" r="72.9" fill="#000"/></mask></defs>
<circle cx="130" cy="118" r="94" fill="${c}" mask="url(#cm)"/>
<path d="M99,33 L99,52" stroke="${ink}" stroke-width="1.8"/><circle cx="99" cy="33" r="3" fill="${c}"/><g transform="translate(99,64)">${O.tumar(ink, 12)}</g><path d="M99,71 L99,79" stroke="${ink}" stroke-width="1.8"/><g transform="translate(99,83)">${O.diamond(c, 4)}</g>
<g transform="translate(150,138) rotate(14)">${baby}</g>
<g transform="translate(250,40)">${O.star(ink, 9)}</g><g transform="translate(270,120)">${O.star(c, 7)}</g><g transform="translate(36,24)">${O.star(c, 8)}</g><g transform="translate(240,190)">${O.star(ink, 5)}</g><g transform="translate(104,10)">${O.star(ink, 5)}</g>`);
}

module.exports = [
  { id: 9028, slug: 'shilde-masi', category: 'shildekhana', layout: 'medallion',
    palette: { bg: '#fbf2f1', card: '#fffafa', line: '#efd6d3', ink: '#4b3437', name: '#8f3f55', accent: '#b8714f', soft: '#f6e0de', button: '#8f3f55', buttonText: '#fff3f0' },
    envelope: ['#9c4a60', '#fde9e4'], style: { band: 'horn', divider: 'tumar', rosette: 'star8', heading: 'serif' },
    motif: booties, motifW: 200, motifH: 110 },
  { id: 9029, slug: 'shilde-syldyrmaq', category: 'shildekhana', layout: 'classic',
    palette: { bg: '#fdf5eb', card: '#fffbf6', line: '#f0dcc4', ink: '#4a3628', name: '#9a5124', accent: '#b8702a', soft: '#f9e6cf', button: '#9a5124', buttonText: '#fff8ee' },
    envelope: ['#9a5124', '#fde8cc'], style: { band: 'tumar', divider: 'horn', rosette: 'horn8', heading: 'caps' },
    motif: rattle, motifW: 250, motifH: 230 },
  { id: 9030, slug: 'shilde-ay', category: 'shildekhana', layout: 'darkhero', marker: 'circle',
    palette: { bg: '#f5f2f8', card: '#fdfcff', line: '#dcd6e8', ink: '#2f2747', name: '#3d2f6b', accent: '#bf9037', soft: '#e9e4f2', button: '#3d2f6b', buttonText: '#f7e7bd',
      dark: '#2a2152', light: '#f6f0e1' },
    envelope: ['#2a2152', '#f0d79c'], style: { band: 'wave', divider: 'tumar', rosette: 'horn8', heading: 'serif' },
    motif: moonBaby, motifW: 290, motifH: 222 },
];
