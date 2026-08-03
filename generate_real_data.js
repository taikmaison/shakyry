import fs from 'fs';

const realImages = [
  "https://tyrasoft.kz/uploads/beyne/templates/template_296_62e07cc9f8734a329cf456dfa0aefe7e.jpg",
  "https://tyrasoft.kz/uploads/beyne/templates/template_338_433a0e8e2cb04ab484b214a7a3c07437.png",
  "https://tyrasoft.kz/uploads/beyne/templates/template_268_d4589a6dd7304b61a951c9aa2fb9a6c0.jpg",
  "https://tyrasoft.kz/uploads/beyne/templates/template_314_5a19e099856f45249bb60c13aba3ea78.png",
  "https://tyrasoft.kz/uploads/beyne/templates/template_394_6d10a20da4e149a39c7dd9286e467bb8.png",
  "https://tyrasoft.kz/uploads/beyne/templates/template_391_2d65cde1358b4debb4d677a24ac7a237.png",
  "https://tyrasoft.kz/uploads/beyne/templates/template_a0c6253127794097b3f7e88bcc4c694b.png",
  "https://tyrasoft.kz/uploads/beyne/templates/template_382_2ab901a1cbd145df9bae4c271533a937.png",
  "https://tyrasoft.kz/uploads/beyne/templates/template_7a318912a39e406790f89b1aa1204761.jpg",
  "https://tyrasoft.kz/uploads/beyne/templates/template_278_4d9a4aa0a7c9488c9f74977109f8499e.png",
  "https://tyrasoft.kz/uploads/beyne/templates/template_368_0341e6c02ccc4ae696e18cb9f5184227.png",
  "https://tyrasoft.kz/uploads/beyne/templates/template_168_4797a443611943068b260e55368b1ff4.png",
  "https://tyrasoft.kz/uploads/beyne/templates/template_16eddc6b6d904bbfadbdd6ab223d5c9c.jpg",
  "https://tyrasoft.kz/uploads/beyne/templates/template_076b26917177451b95b69e9f22b275fe.png",
  "https://tyrasoft.kz/uploads/beyne/templates/template_253_08991ef2f48f4c819c6e3bc678efd25e.png"
];

const categories = [
  'uylenu-toi', 'kyz-uzatu', 'syrga-salu', 'kudalyk', 
  'merey-toi', 'tugan-kun', 'tusaukeser', 'sundet-toi'
];

let templates = [];
let idCounter = 1;

for (let cat of categories) {
   // Give each category 3 to 6 templates
   const numTemplates = Math.floor(Math.random() * 4) + 3;
   for (let i = 0; i < numTemplates; i++) {
       const randomImage = realImages[Math.floor(Math.random() * realImages.length)];
       templates.push({
           id: idCounter++,
           categoryId: cat,
           title: `Шаблон №${idCounter}`,
           type: 'Шақыру сайты',
           price: '4 900 ₸',
           image: randomImage,
           isNew: Math.random() > 0.7
       });
   }
}

const fileContent = `export const mockTemplates = ${JSON.stringify(templates, null, 2)};\n`;
fs.writeFileSync('src/real_templates.js', fileContent);
