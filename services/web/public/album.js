// Альбом приглашения: гости добавляют фото с праздника
(() => {
  const D = window.__ALBUM__;
  const kz = D.lang !== 'ru';
  const T = kz
    ? { title: 'Той сәттері', back: '← Шақыруға', add: 'Фото қосу', who: 'Атыңыз (міндетті емес)', empty: 'Әзірше фото жоқ.\nБірінші болып бөлісіңіз!', loading: 'Жүктелуде…', fail: 'Жүктеу мүмкін болмады' }
    : { title: 'Моменты праздника', back: '← К приглашению', add: 'Добавить фото', who: 'Ваше имя (необязательно)', empty: 'Пока нет фото.\nПоделитесь первым!', loading: 'Загрузка…', fail: 'Не удалось загрузить' };
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
      fd.append('file', f);
      fd.append('name', name);
      const r = await fetch(D.api, { method: 'POST', body: fd }).catch(() => null);
      if (!r || !r.ok) alert(T.fail);
    }
    e.target.value = '';
    btn.disabled = false;
    $('#addText').textContent = T.add;
    load();
  });
  $('#add').addEventListener('click', () => $('#file').click());
  load();
})();
