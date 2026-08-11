const fs = require('fs');
const html = fs.readFileSync('public/invitations/ellima-renat/index.html', 'utf8');
const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.+?)<\/script>/);
if (match) {
  const data = JSON.parse(match[1]);
  fs.writeFileSync('temp.json', JSON.stringify(data.props.pageProps, null, 2));
  console.log('Extracted to temp.json');
}
