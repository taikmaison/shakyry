import puppeteer from 'puppeteer';

async function check() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));
  
  await page.goto('http://localhost:5173/demos/296/index.html', { waitUntil: 'networkidle0' });
  await page.screenshot({ path: 'screenshot.png' });
  
  const content = await page.content();
  console.log('HTML Snippet:', content.substring(0, 500));
  
  await browser.close();
}
check();
