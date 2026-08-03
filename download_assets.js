import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the existing templates
import { mockTemplates } from './src/real_templates.js';

const publicDir = path.join(__dirname, 'public', 'templates');

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

async function downloadImage(url, filename) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Status: ${res.status}`);
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(filename, buffer);
    return true;
  } catch (err) {
    console.error(`Failed to download ${url}`, err.message);
    return false;
  }
}

async function run() {
  console.log(`Found ${mockTemplates.length} templates to process.`);
  let updatedTemplates = [];
  
  for (let i = 0; i < mockTemplates.length; i++) {
    const t = mockTemplates[i];
    const imageUrl = t.image;
    
    // Extract extension (e.g. .jpg, .png)
    const ext = imageUrl.split('.').pop().split('?')[0]; 
    const localFileName = `template_${t.id}.${ext}`;
    const localFilePath = path.join(publicDir, localFileName);
    const localFileUrl = `/templates/${localFileName}`;

    console.log(`[${i+1}/${mockTemplates.length}] Downloading ${imageUrl} -> ${localFileUrl}`);
    
    const success = await downloadImage(imageUrl, localFilePath);
    
    updatedTemplates.push({
      ...t,
      image: success ? localFileUrl : t.image // fallback to original if failed
    });
  }

  // Rewrite the file
  const fileContent = `export const mockTemplates = ${JSON.stringify(updatedTemplates, null, 2)};\n`;
  fs.writeFileSync(path.join(__dirname, 'src', 'real_templates.js'), fileContent);
  console.log("All done! Updated src/real_templates.js to use local images.");
}

run();
