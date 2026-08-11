import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  page.on('request', req => {
    if (req.resourceType() === 'xhr' || req.resourceType() === 'fetch') {
      console.log('API:', req.url());
    }
  });
  
  await page.goto('https://www.shaqyru24.kz/kz/view?builder_page_id=8edab90a-aa32-4270-a819-3689d0b58296&site_id=370&status=demo', { waitUntil: 'networkidle0' });
  await browser.close();
})();
