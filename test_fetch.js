import fs from 'fs';

async function testFetch() {
  const url = 'https://shaqyru24.kz/view?builder_page_id=8956ed7e-0c5c-43bc-b876-0d58e63f0ba1&site_id=370&status=demo';
  try {
    const res = await fetch(url);
    const text = await res.text();
    fs.writeFileSync('template_test.html', text);
    console.log('Saved to template_test.html');
  } catch(e) {
    console.error(e);
  }
}

testFetch();
