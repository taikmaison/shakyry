const fs = require('fs');
const path = require('path');

const srcDir = 'public/demos/314';
const destDir = 'public/invitations/ellima-renat';

// Clear out destDir
if (fs.existsSync(destDir)) {
  fs.rmSync(destDir, { recursive: true, force: true });
}
fs.mkdirSync(destDir, { recursive: true });

function copyRecursiveSync(src, dest) {
  const stats = fs.statSync(src);
  const isDirectory = stats.isDirectory();
  if (isDirectory) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest);
    fs.readdirSync(src).forEach(function(childItemName) {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

copyRecursiveSync(srcDir, destDir);

const FILE_PATH = path.join(destDir, 'index.html');
let html = fs.readFileSync(FILE_PATH, 'utf8');

// Replacements in NEXT_DATA
html = html.replace(/Самат/g, 'Ренат');
html = html.replace(/Динара/g, 'Эллима');
html = html.replace(/2025-09-14T15:30:00/g, '2026-09-12T17:00:00');
html = html.replace(/2025-09-14/g, '2026-09-12');
html = html.replace(/Алматы/g, 'Казарман');
html = html.replace(/ресторан \\"Абиба\\"/g, 'Тойкана \\"Нуржигит\\", Улица Кожалиев 69');
html = html.replace(/ресторан "Абиба"/g, 'Тойкана "Нуржигит", Улица Кожалиев 69');
html = html.replace(/https:\/\/2gis\.com\/j4jSL/g, 'https://2gis.kg/bishkek/geo/70030076653065458/74.029401,41.403177');
html = html.replace(/Болмановтар әулеті/g, 'Жекшенбек Бактыгул');
html = html.replace(/Той иелері:/g, 'Той ээси:');
html = html.replace(/lang="kk"/g, 'lang="ky"');
html = html.replace(/Сіз\(дер\)ді ұлымыз Ренат пен қызымыз Эллиманың үйлену тойына арналған салтанатты ақ дастарханымыздың қадірлі қонағы болуға шақырамыз./g, 'Сиздерди балдарыбыз Ренат жана Эллиманын баш кошуу аземине арналган үйлөнүү тоюна келип, кубанычыбызды тең бөлүшүп кетүүгө чакырабыз!');

// Also replace the title to reflect the names
html = html.replace(/Үйлену той/g, 'Үйлөнүү той');

fs.writeFileSync(FILE_PATH, html);
console.log('Replaced successfully.');
