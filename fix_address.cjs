const fs = require('fs');
let h = fs.readFileSync('public/invitations/ellima-renat/index.html', 'utf8');
h = h.replace(/Тойкана "Нуржигит"/g, 'Тойкана "Нуржигит", Улица Кожалиев 69');
h = h.replace(/Тойкана \\"Нуржигит\\"/g, 'Тойкана \\"Нуржигит\\", Улица Кожалиев 69');
fs.writeFileSync('public/invitations/ellima-renat/index.html', h);
