import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import * as cheerio from 'cheerio';

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

  const dataPath = path.join(tplDir, 'data.json');

  console.log(`[ID:${id}] Fetching HTML for JSON...`);
  let htmlText;
  try {
    const res = await fetch(template.previewUrl);
    htmlText = await res.text();
  } catch(e) {
    console.error(`[ID:${id}] Failed to fetch HTML`);
    return;
  }

  const $ = cheerio.load(htmlText);
  const nextDataText = $('#__NEXT_DATA__').html();
  
  if (!nextDataText) {
    console.error(`[ID:${id}] No __NEXT_DATA__ found`);
    return;
  }

  let nextData;
  try {
    nextData = JSON.parse(nextDataText);
  } catch(e) {
    console.error(`[ID:${id}] Failed to parse JSON`);
    return;
  }

  const pageData = nextData?.props?.pageProps?.pageData?.builderPageData;
  if (!pageData || !pageData.blocks) {
    console.error(`[ID:${id}] No builderPageData.blocks found`);
    return;
  }

  const blocks = pageData.blocks;
  
  // Recursively find and replace image URLs
  let downloadedCount = 0;
  
  async function traverseAndDownload(obj) {
    if (typeof obj === 'string') {
      if (obj.includes('tyrasoft.kz') && obj.match(/\.(png|jpg|jpeg|webp|gif|svg)/i)) {
        const fullUrl = obj;
        const ext = getExtension(fullUrl);
        const hash = crypto.createHash('md5').update(fullUrl).digest('hex').substring(0, 8);
        const filename = `img_${hash}.${ext}`;
        const localPath = path.join(assetsDir, filename);
        const localUrl = `/demos/${id}/assets/${filename}`;

        if (!fs.existsSync(localPath)) {
          await downloadFile(fullUrl, localPath);
        }
        downloadedCount++;
        return localUrl;
      }
      return obj;
    }
    
    if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i++) {
        obj[i] = await traverseAndDownload(obj[i]);
      }
      return obj;
    }
    
    if (obj !== null && typeof obj === 'object') {
      for (const key of Object.keys(obj)) {
        obj[key] = await traverseAndDownload(obj[key]);
      }
      return obj;
    }
    
    return obj;
  }

  const localizedBlocks = await traverseAndDownload(blocks);
  
  // Save specific font family URLs? Actually we can just leave fonts alone or download them later.

  fs.writeFileSync(dataPath, JSON.stringify(localizedBlocks, null, 2));
  console.log(`[ID:${id}] Saved data.json. Downloaded ${downloadedCount} URLs.`);
}

async function run() {
  console.log(`Processing ${mockTemplates.length} templates with JSON scraper...`);
  const concurrency = 10;
  for (let i = 0; i < mockTemplates.length; i += concurrency) {
    const batch = mockTemplates.slice(i, i + concurrency);
    await Promise.all(batch.map(processTemplate));
    console.log(`Progress: ${Math.min(i + batch.length, mockTemplates.length)}/${mockTemplates.length}`);
  }
  console.log('Done!');
}

run();
