const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  const allTemplates = [];

  // Enable request interception to find API calls
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('/api/') || url.includes('.json')) {
      try {
        const json = await response.json();
        // console.log("Found JSON at", url);
        // fs.appendFileSync('api_logs.txt', url + '\n' + JSON.stringify(json).substring(0, 500) + '\n\n');
      } catch (e) {}
    }
  });

  const categoriesToScrape = [
    { id: 'wedding', myId: 'uylenu-toi' },
    { id: 'kyz-uzatu', myId: 'kyz-uzatu' },
    { id: 'syrga-salu', myId: 'syrga-salu' },
    { id: 'kudalyk', myId: 'kudalyk' },
    { id: 'merey-toi', myId: 'merey-toi' },
    { id: 'tugan-kun', myId: 'tugan-kun' },
    { id: 'tusaukeser', myId: 'tusaukeser' },
    { id: 'sundet-toi', myId: 'sundet-toi' }
  ];

  for (let cat of categoriesToScrape) {
    const url = `https://www.shaqyru24.kz/kz/template-selection?category_name=${cat.id}&type=photo&invitation_lang=kz`;
    console.log(`Scraping: ${url}`);
    
    await page.goto(url, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000)); // wait for rendering

    // Scroll down multiple times to load lazy images
    for (let i = 0; i < 5; i++) {
        await page.evaluate(() => window.scrollBy(0, window.innerHeight));
        await new Promise(r => setTimeout(r, 500));
    }

    const templates = await page.evaluate((myId) => {
      const results = [];
      const images = Array.from(document.querySelectorAll('img')).filter(img => img.src.includes('tyrasoft.kz') || img.src.includes('templates'));
      
      images.forEach((img, index) => {
        // Find parent container to extract title/price
        // For simplicity, we just assign standard titles if we can't find them, but let's try
        results.push({
           categoryId: myId,
           image: img.src,
           title: img.alt || `Шаблон №${index + 1}`,
           price: '4 900 ₸', // Defaulting as seen earlier
           type: 'Шақыру сайты'
        });
      });
      return results;
    }, cat.myId);

    // Filter duplicates for this category
    const unique = [];
    const seen = new Set();
    for (let t of templates) {
       if (!seen.has(t.image)) {
           seen.add(t.image);
           unique.push(t);
       }
    }

    console.log(`Found ${unique.length} templates for ${cat.id}`);
    allTemplates.push(...unique);
  }

  // Deduplicate globally if needed, though they are in different categories
  // Write to file
  const fileContent = `export const mockTemplates = ${JSON.stringify(allTemplates, null, 2)};`;
  fs.writeFileSync('src/real_templates.js', fileContent);
  console.log('Saved to src/real_templates.js');

  await browser.close();
})();
