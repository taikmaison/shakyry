import fs from 'fs';
import * as cheerio from 'cheerio';
const html = fs.readFileSync('template_test.html', 'utf8');
const $ = cheerio.load(html);
const text = $('#__NEXT_DATA__').html();
if (text) {
  const data = JSON.parse(text);
  fs.writeFileSync('template_data.json', JSON.stringify(data.props.pageProps.pageData.builderPageData.blocks, null, 2));
  console.log('Saved');
} else {
  console.log('Not found');
}
