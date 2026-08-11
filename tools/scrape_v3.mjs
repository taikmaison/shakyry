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
  
  await page.setViewport({ width: 400, height: 800 });
  
  const downloadedFiles = new Map();
  
  page.on('response', async (response) => {
    const url = response.url();
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
      } catch (e) {}
    }
  });

  console.log('Navigating to', TARGET_URL);
  
  // Set localStorage language to kz to bypass modal
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('NEXT_LOCALE', 'kz');
    localStorage.setItem('i18nextLng', 'kz');
    localStorage.setItem('language', 'kz');
  });

  await page.goto(TARGET_URL, { waitUntil: 'networkidle0' });
  
  console.log('Waiting for modal to appear...');
  await new Promise(r => setTimeout(r, 2000));
  
  // Attempt to click using Puppeteer XPath
  try {
    const [element] = await page.$x("//span[contains(text(), 'Қазақша')] | //div[contains(text(), 'Қазақша')] | //p[contains(text(), 'Қазақша')]");
    if (element) {
        await element.click();
        console.log('Clicked Kazaksha via XPath');
    } else {
        console.log('No Kazaksha element found');
    }
  } catch(e) {
    console.log('XPath click failed', e);
  }

  console.log('Waiting for template render...');
  await new Promise(r => setTimeout(r, 5000));
  
  await page.screenshot({ path: path.join(OUT_DIR, 'final_screenshot.png') });
  
  await page.evaluate(() => {
    document.querySelectorAll('script').forEach(s => s.remove());
    document.querySelectorAll('next-route-announcer').forEach(el => el.remove());
    document.querySelectorAll('#__NEXT_DATA__').forEach(el => el.remove());
  });

  let html = await page.content();
  
  for (const [originalUrl, localPath] of downloadedFiles.entries()) {
    html = html.split(originalUrl).join(localPath);
    const urlObj = new URL(originalUrl);
    if (urlObj.pathname.startsWith('/_next/')) {
        html = html.split(urlObj.pathname).join(localPath);
    }
  }
  
  html = html.replace('<head>', '<head><base href="/invitations/ellima-renat/">');
  
  await fs.writeFile(path.join(OUT_DIR, 'raw_static.html'), html);
  console.log('Saved raw_static.html');
  
  await browser.close();
}

scrapeStatic().catch(console.error);
