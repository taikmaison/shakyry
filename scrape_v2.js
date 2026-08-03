import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the existing templates
import { mockTemplates } from './src/real_templates.js';

const demosDir = path.join(__dirname, 'public', 'demos');

async function downloadFile(url, destPath) {
  try {
    const res = await fetch(url);
    if (!res.ok) return false;
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(destPath, buffer);
    return true;
  } catch (err) {
    return false;
  }
}

function getExtension(urlStr) {
  try {
    const ext = urlStr.match(/\.(png|jpg|jpeg|webp|gif|svg)(\?.*)?$/i);
    return ext ? ext[1] : 'jpg';
  } catch (e) {
    return 'jpg';
  }
}

async function processTemplate(template) {
  const id = template.id;
  const tplDir = path.join(demosDir, id.toString());
  const assetsDir = path.join(tplDir, 'assets');
  
  if (!fs.existsSync(tplDir)) fs.mkdirSync(tplDir, { recursive: true });
  if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

  const htmlPath = path.join(tplDir, 'index.html');

  console.log(`[ID:${id}] Fetching HTML...`);
  let htmlText;
  try {
    const res = await fetch(template.previewUrl);
    htmlText = await res.text();
  } catch(e) {
    console.error(`[ID:${id}] Failed to fetch HTML`);
    return;
  }

  // 1. Convert relative links and scripts to absolute so Next.js can boot
  htmlText = htmlText.replace(/(href|src)="(\/_next\/[^"]+)"/g, '$1="https://shaqyru24.kz$2"');
  
  // 2. Remove external analytics just in case
  htmlText = htmlText.replace(/<script[^>]*google-analytics[^>]*>.*?<\/script>/gs, '');
  htmlText = htmlText.replace(/<script[^>]*gtag[^>]*>.*?<\/script>/gs, '');
  htmlText = htmlText.replace(/<noscript>.*?googletagmanager.*?<\/noscript>/gs, '');

  // 3. Find all tyrasoft.kz image URLs (which are used in the template)
  const imageUrlRegex = /https:\/\/tyrasoft\.kz\/[a-zA-Z0-9_\-\/\.]+\.(png|jpg|jpeg|webp)/gi;
  const matches = [...new Set(htmlText.match(imageUrlRegex) || [])];

  for (const fullUrl of matches) {
    const ext = getExtension(fullUrl);
    const hash = crypto.createHash('md5').update(fullUrl).digest('hex').substring(0, 8);
    const filename = `img_${hash}.${ext}`;
    const localPath = path.join(assetsDir, filename);
    const localUrl = `/demos/${id}/assets/${filename}`; // Absolute path relative to localhost

    // Download image if not exists
    if (!fs.existsSync(localPath)) {
      await downloadFile(fullUrl, localPath);
    }
    
    // Replace in HTML
    // Use split/join to replace all occurrences reliably
    htmlText = htmlText.split(fullUrl).join(localUrl);
  }

  // Add a small script to remove loading screen forcefully if it gets stuck
  const forceRemoveLoader = `
    <script>
      window.addEventListener('load', () => {
        setTimeout(() => {
          const loader = document.querySelector('.jsx-3744705515');
          if (loader && loader.style.zIndex == '10000001') {
            loader.style.display = 'none';
          }
        }, 1500);
      });
    </script>
  `;
  htmlText = htmlText.replace('</body>', forceRemoveLoader + '</body>');

  fs.writeFileSync(htmlPath, htmlText);
  console.log(`[ID:${id}] Saved and patched! Downloaded ${matches.length} unique images.`);
}

async function run() {
  console.log(`Processing ${mockTemplates.length} templates with V2 scraper...`);
  const concurrency = 10;
  for (let i = 0; i < mockTemplates.length; i += concurrency) {
    const batch = mockTemplates.slice(i, i + concurrency);
    await Promise.all(batch.map(processTemplate));
    console.log(`Progress: ${Math.min(i + batch.length, mockTemplates.length)}/${mockTemplates.length}`);
  }
  console.log('Done!');
}

run();
