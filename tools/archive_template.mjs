import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TARGET_URL = 'https://www.shaqyru24.kz/kz/view?builder_page_id=8edab90a-aa32-4270-a819-3689d0b58296&site_id=370&status=demo';
const OUT_DIR = path.join(__dirname, 'public', 'invitations', 'ellima-renat');
const ASSETS_DIR = path.join(OUT_DIR, 'assets');

async function scrape() {
  await fs.mkdir(ASSETS_DIR, { recursive: true });
  
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  // To avoid fetching everything twice, we intercept and save
  const downloadedFiles = new Map();
  
  page.on('response', async (response) => {
    const url = response.url();
    if (url.startsWith('https://www.shaqyru24.kz/_next/') || url.match(/\.(png|jpg|jpeg|webp|svg|css|js|mp3|woff2?|ttf)$/i)) {
      try {
        const buffer = await response.buffer();
        const urlObj = new URL(url);
        // Create a flat filename
        let filename = urlObj.pathname.replace(/\//g, '_').replace(/^_/, '');
        if (urlObj.search) {
           filename += urlObj.search.replace(/[^a-zA-Z0-9]/g, '_');
        }
        if (filename.length > 200) filename = filename.substring(filename.length - 200);
        
        await fs.writeFile(path.join(ASSETS_DIR, filename), buffer);
        downloadedFiles.set(url, 'assets/' + filename);
        console.log(`Saved: ${filename}`);
      } catch (e) {
        // ignore errors for streaming responses etc
      }
    }
  });

  console.log('Navigating to', TARGET_URL);
  await page.goto(TARGET_URL, { waitUntil: 'networkidle0' });
  
  // Wait a bit extra for any animations or late chunks
  await new Promise(r => setTimeout(r, 5000));
  
  let html = await page.content();
  
  // Rewrite HTML
  for (const [originalUrl, localPath] of downloadedFiles.entries()) {
    // Replace absolute URLs
    html = html.split(originalUrl).join(localPath);
    // Replace relative Next URLs
    const urlObj = new URL(originalUrl);
    if (urlObj.pathname.startsWith('/_next/')) {
        html = html.split(urlObj.pathname).join(localPath);
    }
  }
  
  // Make sure base is correctly set just in case
  html = html.replace('<head>', '<head><base href="/invitations/ellima-renat/">');
  
  await fs.writeFile(path.join(OUT_DIR, 'index.html'), html);
  console.log('Saved index.html');
  
  await browser.close();
}

scrape().catch(console.error);
