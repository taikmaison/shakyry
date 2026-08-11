import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TARGET_URL = 'https://www.shaqyru24.kz/kz/view?builder_page_id=8edab90a-aa32-4270-a819-3689d0b58296&site_id=370&status=demo';
const OUT_DIR = path.join(__dirname, 'public', 'invitations', 'ellima-renat');
const ASSETS_DIR = path.join(OUT_DIR, 'assets');

async function scrapeStatic() {
  await fs.mkdir(ASSETS_DIR, { recursive: true });
  
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  // Set viewport to mobile size for better responsive extraction if needed
  await page.setViewport({ width: 400, height: 800 });
  
  const downloadedFiles = new Map();
  
  page.on('response', async (response) => {
    const url = response.url();
    // Only intercept css, images, fonts, audio
    if (url.match(/\.(png|jpg|jpeg|webp|svg|css|mp3|woff2?|ttf)$/i)) {
      try {
        const buffer = await response.buffer();
        const urlObj = new URL(url);
        let filename = urlObj.pathname.replace(/\//g, '_').replace(/^_/, '');
        if (urlObj.search) {
           filename += urlObj.search.replace(/[^a-zA-Z0-9]/g, '_');
        }
        if (filename.length > 200) filename = filename.substring(filename.length - 200);
        
        await fs.writeFile(path.join(ASSETS_DIR, filename), buffer);
        downloadedFiles.set(url, 'assets/' + filename);
        console.log(`Saved: ${filename}`);
      } catch (e) {}
    }
  });

  console.log('Navigating to', TARGET_URL);
  await page.goto(TARGET_URL, { waitUntil: 'networkidle0' });
  
  console.log('Waiting for render...');
  await new Promise(r => setTimeout(r, 8000));
  
  // Remove scripts from the live DOM before extracting HTML
  await page.evaluate(() => {
    document.querySelectorAll('script').forEach(s => s.remove());
    // Next.js specific elements
    document.querySelectorAll('next-route-announcer').forEach(el => el.remove());
    document.querySelectorAll('#__NEXT_DATA__').forEach(el => el.remove());
  });

  let html = await page.content();
  
  // Rewrite HTML to use local assets
  for (const [originalUrl, localPath] of downloadedFiles.entries()) {
    html = html.split(originalUrl).join(localPath);
    const urlObj = new URL(originalUrl);
    if (urlObj.pathname.startsWith('/_next/')) {
        html = html.split(urlObj.pathname).join(localPath);
    }
  }
  
  // Add base tag for correct path resolution
  html = html.replace('<head>', '<head><base href="/invitations/ellima-renat/">');
  
  // Replace text content based on user requirements
  // 1. Names: Эллима & Ренат
  // Template 314 might have some placeholder names like "Динара & ..." or "Нұрболат & Арайлым"
  
  await fs.writeFile(path.join(OUT_DIR, 'raw_static.html'), html);
  console.log('Saved raw_static.html');
  
  await browser.close();
}

scrapeStatic().catch(console.error);
