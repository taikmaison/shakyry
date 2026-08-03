import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as cheerio from 'cheerio';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the existing templates
import { mockTemplates } from './src/real_templates.js';

const demosDir = path.join(__dirname, 'public', 'demos');
if (!fs.existsSync(demosDir)) fs.mkdirSync(demosDir, { recursive: true });

function getExtension(urlStr) {
  try {
    const u = new URL(urlStr);
    const basename = path.basename(u.pathname);
    const ext = path.extname(basename);
    return ext ? ext.split('?')[0] : '';
  } catch (e) {
    return '';
  }
}

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

async function processTemplate(template) {
  const id = template.id;
  const tplDir = path.join(demosDir, id.toString());
  const assetsDir = path.join(tplDir, 'assets');
  
  if (!fs.existsSync(tplDir)) fs.mkdirSync(tplDir, { recursive: true });
  if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

  const htmlPath = path.join(tplDir, 'index.html');
  // Skip if already done
  // if (fs.existsSync(htmlPath)) {
  //   console.log(`[ID:${id}] Already downloaded, skipping.`);
  //   return;
  // }

  console.log(`[ID:${id}] Fetching HTML from ${template.previewUrl}`);
  let htmlText;
  try {
    const res = await fetch(template.previewUrl);
    htmlText = await res.text();
  } catch(e) {
    console.error(`[ID:${id}] Failed to fetch HTML`);
    return;
  }

  const $ = cheerio.load(htmlText);

  // 1. Remove all scripts
  $('script').remove();
  
  // Also remove noscript and meta pixels
  $('noscript').remove();

  // Helper to resolve URLs
  const resolveUrl = (src) => {
    if (!src) return null;
    if (src.startsWith('//')) return 'https:' + src;
    if (src.startsWith('/')) return 'https://shaqyru24.kz' + src;
    if (src.startsWith('http')) return src;
    return null;
  };

  // 2. Download CSS
  const links = $('link[rel="stylesheet"]').toArray();
  for (const link of links) {
    let href = $(link).attr('href');
    let fullUrl = resolveUrl(href);
    if (fullUrl) {
      const ext = getExtension(fullUrl) || '.css';
      const hash = crypto.createHash('md5').update(fullUrl).digest('hex').substring(0, 8);
      const filename = `style_${hash}${ext}`;
      const localPath = path.join(assetsDir, filename);
      const localUrl = `./assets/${filename}`;
      
      const success = await downloadFile(fullUrl, localPath);
      if (success) {
        $(link).attr('href', localUrl);
      }
    }
  }

  // 3. Download images in <img> tags
  const images = $('img').toArray();
  for (const img of images) {
    let src = $(img).attr('src');
    if (!src || src.startsWith('data:')) continue;
    
    let fullUrl = resolveUrl(src);
    if (fullUrl) {
      const ext = getExtension(fullUrl) || '.jpg';
      const hash = crypto.createHash('md5').update(fullUrl).digest('hex').substring(0, 8);
      const filename = `img_${hash}${ext}`;
      const localPath = path.join(assetsDir, filename);
      const localUrl = `./assets/${filename}`;

      // if (!fs.existsSync(localPath)) 
      await downloadFile(fullUrl, localPath);
      
      $(img).attr('src', localUrl);
      $(img).removeAttr('srcSet');
      $(img).removeAttr('srcset');
    }
  }

  // 4. Download images in inline styles (background-image: url(...))
  const elementsWithStyle = $('[style]').toArray();
  for (const el of elementsWithStyle) {
    let styleStr = $(el).attr('style');
    if (styleStr && styleStr.includes('url(')) {
      // Very basic regex for url("...") or url(...)
      const urlRegex = /url\(['"]?([^'"\)]+)['"]?\)/g;
      let match;
      while ((match = urlRegex.exec(styleStr)) !== null) {
        let src = match[1];
        if (src.startsWith('data:')) continue;
        
        let fullUrl = resolveUrl(src);
        if (fullUrl) {
          const ext = getExtension(fullUrl) || '.jpg';
          const hash = crypto.createHash('md5').update(fullUrl).digest('hex').substring(0, 8);
          const filename = `bg_${hash}${ext}`;
          const localPath = path.join(assetsDir, filename);
          const localUrl = `./assets/${filename}`;
          
          await downloadFile(fullUrl, localPath);
          styleStr = styleStr.replace(match[0], `url('${localUrl}')`);
        }
      }
      $(el).attr('style', styleStr);
    }
  }

  // 5. Remove 'back to templates' and 'download' overlays injected by their wrapper
  $('.back-button-container').remove();
  $('.download-button-container').remove();

  // Add our own simple script if we want, or just leave it static
  
  fs.writeFileSync(htmlPath, $.html());
  console.log(`[ID:${id}] Saved local HTML and assets`);
}

async function run() {
  console.log(`Processing ${mockTemplates.length} templates...`);
  // Process 5 templates concurrently
  const concurrency = 5;
  for (let i = 0; i < mockTemplates.length; i += concurrency) {
    const batch = mockTemplates.slice(i, i + concurrency);
    await Promise.all(batch.map(processTemplate));
    console.log(`Progress: ${i + batch.length}/${mockTemplates.length}`);
  }
  console.log('All templates downloaded and localized!');
}

run();
