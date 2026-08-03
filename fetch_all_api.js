import fs from 'fs';

// Map API categories to our App categories
const apiCatToOurCat = {
  'wedding': 'uylenu-toi',
  'bachelorette': 'kyz-uzatu',
  'syrga_salu': 'syrga-salu',
  'kudalyk': 'kudalyk',
  'merey': 'merey-toi',
  'birthday': 'tugan-kun',
  'tilashar': 'tusaukeser', // mapping closely if it matches
  'sundet': 'sundet-toi'
};

async function run() {
  const url = `https://tyrasoft.kz/api/v2/page-builder/templates/list?skip=0&limit=500&main_category=toi&lang=kz&sort_by=total_sold`;
  console.log("Fetching all templates...");
  
  let allTemplates = [];
  try {
    const res = await fetch(url);
    const data = await res.json();
    
    if (data && data.templates) {
       for (let t of data.templates) {
          const ourCat = apiCatToOurCat[t.category];
          if (ourCat) {
             allTemplates.push({
                 id: t.template_id,
                 categoryId: ourCat,
                 title: t.page_title,
                 type: 'Шақыру сайты',
                 price: '4 900 ₸',
                 image: 'https://tyrasoft.kz' + t.photo,
                 previewUrl: t.demo_url,
                 isNew: t.stats_age_mins < 1440 // just an example check for newness
             });
          }
       }
    }
  } catch(e) {
     console.error("Error", e.message);
  }

  // Save to src/real_templates.js
  const fileContent = `export const mockTemplates = ${JSON.stringify(allTemplates, null, 2)};\n`;
  fs.writeFileSync('src/real_templates.js', fileContent);
  console.log(`Saved total ${allTemplates.length} templates.`);
}

run();
