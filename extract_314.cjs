const fs = require('fs');
const html = fs.readFileSync('public/invitations/ellima-renat/index.html', 'utf8');
const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.+?)<\/script>/);
if (match) {
  const data = JSON.parse(match[1]);
  fs.writeFileSync('template314_data.json', JSON.stringify(data.props.pageProps, null, 2));
  console.log('Extracted to template314_data.json');
} else {
  console.log('__NEXT_DATA__ not found');
}
