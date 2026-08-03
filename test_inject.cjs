const fs = require('fs');
let html = fs.readFileSync('public/demos/296/index.html', 'utf8');
html = html.replace('<head>', '<head><script>window.history.replaceState({}, "", "/view");</script>');
fs.writeFileSync('public/demos/296/test.html', html);
console.log('Injected');
