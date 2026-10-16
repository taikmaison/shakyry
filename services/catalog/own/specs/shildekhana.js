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

// #9030: шілдехана — ночь бдения: горит шырақ (свеча в узорном шамдале) с ореолом, рядом на нити тұмар; вокруг звёзды
function shyraq(P, O) {
  const c = P.accent, ink = P.ink, dk = P.soft;
  return O.svg(290, 222, `
<defs><radialGradient id="gl" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="${c}" stop-opacity=".6"/><stop offset=".4" stop-color="${c}" stop-opacity=".2"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient></defs>
<circle cx="145" cy="68" r="66" fill="url(#gl)"/>
<path d="M145,14 C157,34 164,48 164,62 C164,76 155,86 145,86 C135,86 126,76 126,62 C126,48 133,34 145,14 Z" fill="${c}"/>
<path d="M145,40 C152,52 155,60 155,68 C155,76 150,80 145,80 C140,80 135,76 135,68 C135,60 138,52 145,40 Z" fill="${ink}"/>
<path d="M145,78 L145,92" stroke="${dk}" stroke-width="2.6" stroke-linecap="round"/>
<path d="M130,92 C130,88 160,88 160,92 L160,150 L130,150 Z" fill="${ink}"/>
<path d="M136,94 C136,104 140,108 140,116" fill="none" stroke="${c}" stroke-width="2.2" stroke-linecap="round" opacity=".55"/>
<path d="M98,150 L192,150 C190,164 172,172 145,172 C118,172 100,164 98,150 Z" fill="${c}"/>
<g transform="translate(145,163) scale(.26)">${O.horn(dk, 10)}</g>
<g transform="translate(110,156)">${O.diamond(dk, 3)}</g><g transform="translate(180,156)">${O.diamond(dk, 3)}</g>
<rect x="139" y="171" width="12" height="20" fill="${c}"/><circle cx="145" cy="182" r="6.5" fill="${c}" stroke="${dk}" stroke-width="1.6"/>
<path d="M112,208 C116,196 128,190 145,190 C162,190 174,196 178,208 Z" fill="${c}"/><rect x="104" y="206" width="82" height="9" rx="3" fill="${c}"/>
<path d="M62,0 L62,64" stroke="${ink}" stroke-width="1.6"/><circle cx="62" cy="64" r="3" fill="${c}"/><g transform="translate(62,82)">${O.tumar(ink, 14)}</g>
<path d="M62,92 L62,104" stroke="${ink}" stroke-width="1.6"/><g transform="translate(62,110)">${O.diamond(c, 5)}</g>
<g fill="none" stroke="${c}" stroke-width="1.8" stroke-linecap="round"><path d="M56,116 L52,136 M62,116 L62,138 M68,116 L72,136"/></g>
<g transform="translate(236,36)">${O.star(ink, 9)}</g><g transform="translate(262,104)">${O.star(c, 7)}</g><g transform="translate(24,30)">${O.star(c, 8)}</g><g transform="translate(222,176)">${O.star(ink, 5)}</g><g transform="translate(30,168)">${O.star(ink, 5)}</g><g transform="translate(204,84)">${O.star(c, 4)}</g>`);
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
    motif: shyraq, motifW: 290, motifH: 222 },
];
