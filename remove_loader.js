import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as cheerio from 'cheerio';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const demosDir = path.join(__dirname, 'public', 'demos');

function run() {
  const folders = fs.readdirSync(demosDir);
  let count = 0;
  for (const folder of folders) {
    const htmlPath = path.join(demosDir, folder, 'index.html');
    if (fs.existsSync(htmlPath)) {
      const html = fs.readFileSync(htmlPath, 'utf8');
      const $ = cheerio.load(html);
      
      // The loader is a div with z-index:10000001
      const loader = $('div').filter(function() {
        const style = $(this).attr('style');
        return style && style.includes('10000001');
      });
      
      if (loader.length > 0) {
        loader.remove();
        fs.writeFileSync(htmlPath, $.html());
        count++;
      }
    }
  }
  console.log(`Removed loader from ${count} files.`);
}

run();
