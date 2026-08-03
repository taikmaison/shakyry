const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({width: 1200, height: 900});
  await page.goto('http://localhost:5173/demos/296/index.html', { waitUntil: 'networkidle0' });
  console.log('Clicking...');
  await page.evaluate(() => {
    const el = document.querySelector('img[alt="АШУ"]');
    if(el) el.click();
  });
  await new Promise(r => setTimeout(r, 4000));
  await page.screenshot({ path: 'test_proxy_success.png' });
  console.log('Saved test_proxy_success.png');
  await browser.close();
})();
