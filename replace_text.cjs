const fs = require('fs');

const FILE_PATH = 'public/invitations/ellima-renat/index.html';
let html = fs.readFileSync(FILE_PATH, 'utf8');

// Replacements
html = html.replace(/Самат/g, 'Ренат');
html = html.replace(/Динара/g, 'Эллима');

// Date replacements
html = html.replace(/2025-09-14T15:30:00/g, '2026-09-12T17:00:00');
html = html.replace(/2025-09-14/g, '2026-09-12');

// Address replacements
html = html.replace(/Алматы/g, 'Казарман');
html = html.replace(/ресторан \\"Абиба\\"/g, 'Тойкана \\"Нуржигит\\"');
html = html.replace(/ресторан "Абиба"/g, 'Тойкана "Нуржигит"');

// GIS link
html = html.replace(/https:\/\/2gis\.com\/j4jSL/g, 'https://2gis.kg/bishkek/geo/70030076653065458/74.029401,41.403177');

// Parents replacement
html = html.replace(/Болмановтар әулеті/g, 'Жекшенбек Бактыгул');
html = html.replace(/Той иелері:/g, 'Той ээси:');

// Ensure language
html = html.replace(/lang="kk"/g, 'lang="ky"');

// Fix text 
html = html.replace(/Сіз\(дер\)ді ұлымыз Ренат пен қызымыз Эллиманың үйлену тойына арналған салтанатты ақ дастарханымыздың қадірлі қонағы болуға шақырамыз./g, 'Сиздерди балдарыбыз Ренат жана Эллиманын баш кошуу аземине арналган үйлөнүү тоюна келип, кубанычыбызды тең бөлүшүп кетүүгө чакырабыз!');

fs.writeFileSync(FILE_PATH, html);
console.log('Replaced successfully.');
