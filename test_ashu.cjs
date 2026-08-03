const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  page.on('requestfailed', request => console.log('REQ FAILED:', request.url(), request.failure().errorText));
  await page.goto('http://localhost:5173/demos/296/index.html', { waitUntil: 'networkidle0' });
  console.log('Page loaded. Clicking AShU...');
  await page.evaluate(() => {
    const el = document.querySelector('img[alt="АШУ"]');
    if(el) {
      el.click();
    } else {
      console.log('Not found img');
    }
  });
  await new Promise(r => setTimeout(r, 2000));
  await browser.close();
})();
