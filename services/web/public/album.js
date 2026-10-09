// Альбом приглашения: гости добавляют фото с праздника
(() => {
  const D = window.__ALBUM__;
  const kz = D.lang !== 'ru';
  const T = kz
    ? { title: 'Той сәттері', back: '← Шақыруға', add: 'Фото қосу', who: 'Атыңыз (міндетті емес)', empty: 'Әзірше фото жоқ.\nБірінші болып бөлісіңіз!', loading: 'Жүктелуде…', fail: 'Жүктеу мүмкін болмады', big: 'Фото тым үлкен' }
    : { title: 'Моменты праздника', back: '← К приглашению', add: 'Добавить фото', who: 'Ваше имя (необязательно)', empty: 'Пока нет фото.\nПоделитесь первым!', loading: 'Загрузка…', fail: 'Не удалось загрузить', big: 'Фото слишком большое' };
  const $ = s => document.querySelector(s);
  document.title = T.title;
  $('h1').textContent = T.title;
  $('#back').textContent = T.back;
  $('#back').href = D.invite;
  $('#who').placeholder = T.who;
  $('#addText').textContent = T.add;
  try { $('#who').value = localStorage.getItem('album:name') || ''; } catch { }

  async function load() {
    const photos = await (await fetch(D.api)).json();
    const box = $('#photos');
    box.replaceChildren();
    if (!photos.length) { box.className = 'empty'; box.textContent = T.empty; box.style.whiteSpace = 'pre-line'; return; }
    box.className = 'photos';
    for (const p of photos) {
      const a = document.createElement('a');
      a.href = p.url; a.target = '_blank';
      const img = document.createElement('img');
      img.src = p.url; img.loading = 'lazy'; img.alt = '';
      a.append(img);
      if (p.name) { const s = document.createElement('span'); s.textContent = p.name; a.append(s); }
      box.append(a);
    }
  }

  // уменьшение перед загрузкой: длинная сторона до 2048 px, JPEG — чтобы фото с телефона уложилось в лимит сервера (~4 МБ)
  const SMALL = 1.5e6, TARGET = 3.8e6;
  async function animated(f) {
    const b = new Uint8Array(await f.slice(0, 256).arrayBuffer());
    const s = String.fromCharCode(...b);
    return s.startsWith('GIF8') || (s.slice(8, 16) === 'WEBPVP8X' && (b[20] & 2) > 0) || (s.startsWith('\x89PNG') && s.includes('acTL'));
  }
  async function decode(f) {
    if (window.createImageBitmap) { try { return await createImageBitmap(f, { imageOrientation: 'from-image' }); } catch { } }
    const url = URL.createObjectURL(f);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return img;
    } finally { URL.revokeObjectURL(url); }
  }
  async function shrink(f) {
    if (!/^image\//.test(f.type) || f.size <= SMALL || await animated(f).catch(() => true)) return f;   // анимацию — как есть
    let src;
    try { src = await decode(f); } catch { return f; }   // не умеет открыть (например HEIC) — отправим как есть, проверит сервер
    const w0 = src.width, h0 = src.height;
    let out = null;
    for (const [side, q] of [[2048, 0.82], [1600, 0.75], [1280, 0.7]]) {
      const k = Math.min(1, side / Math.max(w0, h0));
      const c = document.createElement('canvas');
      c.width = Math.round(w0 * k); c.height = Math.round(h0 * k);
      const g = c.getContext('2d');
      g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);   // прозрачное в JPEG — белым, не чёрным
      g.drawImage(src, 0, 0, c.width, c.height);
      out = await new Promise(r => c.toBlob(r, 'image/jpeg', q));
      if (!out || out.size <= TARGET) break;
    }
    if (src.close) src.close();
    if (!out || out.size >= f.size) return f;
    return new File([out], (f.name || 'photo').replace(/\.[^.]*$/, '') + '.jpg', { type: 'image/jpeg' });
  }

  $('#file').addEventListener('change', async e => {
    const files = [...e.target.files];
    if (!files.length) return;
    const name = $('#who').value.trim();
    try { localStorage.setItem('album:name', name); } catch { }
    const btn = $('#add');
    btn.disabled = true;
    $('#addText').textContent = T.loading;
    for (const f of files) {
      const fd = new FormData();
      fd.append('file', await shrink(f).catch(() => f));
      fd.append('name', name);
      const r = await fetch(D.api, { method: 'POST', body: fd }).catch(() => null);
      if (!r || !r.ok) alert(r && r.status === 413 ? T.big : T.fail);
    }
    e.target.value = '';
    btn.disabled = false;
    $('#addText').textContent = T.add;
    load();
  });
  $('#add').addEventListener('click', () => $('#file').click());
  load();
})();
