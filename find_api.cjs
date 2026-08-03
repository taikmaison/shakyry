const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  const apiResponses = [];

  page.on('response', async (response) => {
    const url = response.url();
    // We want to capture JSON responses that might contain templates
    if (response.request().resourceType() === 'fetch' || response.request().resourceType() === 'xhr') {
       try {
         const json = await response.json();
         apiResponses.push({ url, json });
       } catch(e) {}
    }
  });
  
  console.log("Navigating to wedding category...");
  await page.goto('https://www.shaqyru24.kz/kz/template-selection?category_name=wedding&type=photo&invitation_lang=kz', {
    waitUntil: 'networkidle2'
  });
  
  await new Promise(r => setTimeout(r, 4000));
  
  fs.writeFileSync('api_responses.json', JSON.stringify(apiResponses, null, 2));
  console.log('Saved to api_responses.json');
  await browser.close();
})();
