const fs = require('fs');

const raw = fs.readFileSync('temp.json', 'utf8');
const data = JSON.parse(raw);

const components = data.page.builder_data.components;

// We need to modify text elements in `components`.
components.forEach(comp => {
  if (comp.type === 'text' && comp.data && comp.data.content) {
    console.log('TEXT:', comp.data.content);
  }
  if (comp.type === 'timer' && comp.data) {
    console.log('TIMER:', comp.data.event_date);
  }
  if (comp.type === 'map' && comp.data) {
    console.log('MAP:', comp.data.mapLink);
  }
});
