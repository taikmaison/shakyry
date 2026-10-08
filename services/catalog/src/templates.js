// Формат шаблона и сборка приглашения из него: метки шаблона заменяются данными.
//
// Метки в шаблонах:
//   тексты:  TITLE / Title, жених, невеста, name / ИМЯ, CITY, ADDRESS, HOST, INVITE_TEXT, AGE, DATE, FULL_TIME
//   кнопка карты: https://example.com или ссылка на 2GIS / Google Maps
//   дата: timer.event_date, calendar-pro.event_date/event_time, calendar.event_dates[0], scroll-timeline
//   музыка: audio-fixed.audio_url, audio.audio_url

const TEXT_TOKENS = {
  'TITLE': 'title', 'Title': 'title',
  'жених': 'name1', 'Жених': 'name1', 'ЖЕНИХ': 'name1',
  'name': 'name1', 'Name': 'name1', 'NAME': 'name1', 'ИМЯ': 'name1',
  'невеста': 'name2', 'Невеста': 'name2', 'НЕВЕСТА': 'name2',
  'CITY': 'city', 'ADDRESS': 'address', 'HOST': 'hosts', 'INVITE_TEXT': 'invite_text', 'AGE': 'age',
  'DATE': '_date', 'FULL_TIME': '_time',
  // заготовки, которые дизайнеры шаблонов оставили обычным текстом
  'Имя': 'name1', 'Имя1': 'name1', 'Имя2': 'name1', 'КАТЕГОРИЯ': 'title', 'Категория': 'title', 'Ваш текст здесь': 'invite_text',
};
const LONE_DATE = /^\d{1,2}[.\/]\d{1,2}[.\/]\d{4}$/;   // «22.12.2026» — чужая дата из примера шаблона
// «жених & невеста» встречается и внутри строки
const INLINE = /(^|[^\p{L}])(жених|невеста|Жених|Невеста)(?=$|[^\p{L}])/gu;
const MAP_URL = /example\.com|2gis\.|google\.[a-z.]+\/(maps|\?q=)|maps\.google|maps\.app\.goo\.gl|goo\.gl\/maps|yandex\.[a-z]+\/maps/i;
const FIELDS = ['title', 'name1', 'name2', 'age', 'date', 'time', 'city', 'address', 'map_link', 'hosts', 'invite_text', 'music'];

// Примеры для превью и подсказок в форме — свои, нейтральные
const TITLES = {
  kz: { wedding: 'Үйлену тойға шақыру', bachelorette: 'Қыз ұзату тойына шақыру', merey: 'Мерейтойға шақыру', birthday: 'Туған күнге шақыру',
    sundet: 'Сүндет тойға шақыру', tilashar: 'Тілашар тойына шақыру', besik: 'Бесік тойына шақыру', kudalyk: 'Құдалыққа шақыру',
    syrga_salu: 'Сырға салу тойына шақыру', betashar: 'Беташарға шақыру', kyryk: 'Қырқынан шығару тойына шақыру',
    shildekhana: 'Шілдеханаға шақыру', konys: 'Қоныс тойына шақыру', nikah: 'Неке қию рәсіміне шақыру', ramadan: 'Ауызашарға шақыру',
    reception: 'Тойға шақыру', 'nişan': 'Құдалыққа шақыру', 'merey-sundet': 'Тойға шақыру', baptism: 'Тойға шақыру' },
  ru: { wedding: 'Приглашение на свадьбу', birthday: 'Приглашение на день рождения', merey: 'Приглашение на юбилей',
    bachelorette: 'Приглашение на кыз узату', sundet: 'Приглашение на сундет той', reception: 'Приглашение на торжество' },
};
const SAMPLE = {
  kz: { name1: 'Айдос', name2: 'Аружан', age: '60', city: 'Алматы', address: '«Той сарайы» мейрамханасы\nАбай даңғылы, 1',
    hosts: 'Ата-анасы', invite_text: 'Сіздерді ақ дастарханымыздың қадірлі қонағы болуға шақырамыз!' },
  ru: { name1: 'Айдос', name2: 'Аружан', age: '60', city: 'Алматы', address: 'Ресторан «Той сарайы»\nпр. Абая, 1',
    hosts: 'Родители', invite_text: 'Приглашаем вас разделить с нами этот радостный день!' },
};

function sampleFields(tpl) {
  const lang = tpl.lang === 'ru' ? 'ru' : 'kz';
  const d = new Date(Date.now() + 60 * 864e5);
  return {
    ...SAMPLE[lang],
    title: (TITLES[lang] && TITLES[lang][tpl.category]) || TITLES[lang].wedding,
    date: d.toISOString().slice(0, 10), time: '18:00', map_link: 'https://2gis.kz',
  };
}

const pad = n => String(n).padStart(2, '0');
const components = tpl => (tpl.blocks || []).flatMap(b => b.components || []);

// незаполненное поле — пустой текст: гость не должен видеть служебные метки
function replaceText(content, v) {
  const key = content.trim();
  if (Object.prototype.hasOwnProperty.call(TEXT_TOKENS, key)) return v[TEXT_TOKENS[key]] || '';
  if (LONE_DATE.test(key)) return v._date || '';
  return content.replace(INLINE, (m, pre, word) => pre + (v[TEXT_TOKENS[word]] || ''));
}

// Какие поля нужны шаблону — форма показывает только их
function tokensOf(tpl) {
  const found = new Set(['title', 'date', 'time']);
  for (const c of components(tpl)) {
    const d = c.data || {};
    if (typeof d.content === 'string') {
      const key = d.content.trim();
      if (Object.prototype.hasOwnProperty.call(TEXT_TOKENS, key)) found.add(TEXT_TOKENS[key]);
      for (const m of d.content.matchAll(INLINE)) found.add(TEXT_TOKENS[m[2]]);
    }
    if (c.type === 'button' && (!d.url || MAP_URL.test(d.url))) { found.add('map_link'); found.add('city'); found.add('address'); }
    if (c.type === 'audio' || c.type === 'audio-fixed') found.add('music');
  }
  found.delete('_date'); found.delete('_time');
  return [...found];
}

const templateMusic = tpl => [...new Set(components(tpl).filter(c => c.type === 'audio' || c.type === 'audio-fixed').map(c => c.data && c.data.audio_url).filter(Boolean))];

// входные данные для сборки: только известные поля и разумной длины
function sanitize(input = {}) {
  const f = {};
  for (const k of FIELDS) {
    if (input[k] == null) continue;
    const v = String(input[k]).replace(/\r\n/g, '\n').trim().slice(0, 2000);
    if (v) f[k] = v;
  }
  if (f.date && !/^\d{4}-\d{2}-\d{2}$/.test(f.date)) delete f.date;
  if (f.time && !/^\d{2}:\d{2}$/.test(f.time)) delete f.time;
  if (f.map_link && !/^https?:\/\//i.test(f.map_link)) delete f.map_link;
  if (f.music && !/^\/media\/[0-9a-f]{2}\/[0-9a-f]+\.(mp3|m4a|ogg|wav)$/i.test(f.music)) delete f.music;
  return f;
}

// ссылка на карту: введённая; иначе — поиск адреса в 2GIS; иначе кнопки не будет
function mapLink(f) {
  if (f.map_link) return f.map_link;
  const q = [f.city, f.address].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
  return q ? `https://2gis.kz/search/${encodeURIComponent(q)}` : null;
}

function fill(tpl, f) {
  const blocks = structuredClone(tpl.blocks);
  const [y, mo, d] = (f.date || '').split('-').map(Number);
  const time = f.time || '';
  const iso = f.date ? `${f.date}T${time || '00:00'}:00` : null;
  const v = { ...f, _date: f.date ? `${pad(d)}.${pad(mo)}.${y}` : '', _time: time };
  const map = mapLink(f);

  for (const block of blocks) {
    block.components = (block.components || []).filter(c => {
      const data = c.data || (c.data = {});
      // __fit: рендер уменьшает шрифт только у текстов с подставленными данными (как оригинал — остальные не трогает)
      if (typeof data.content === 'string') {
        const filled = replaceText(data.content, v);
        data.__fit = filled !== data.content;
        data.content = filled;
      }
      switch (c.type) {
        case 'button':
          if (!data.url || MAP_URL.test(data.url)) {
            if (!map) return false;          // ни ссылки, ни адреса — кнопка вела бы на чужое заведение
            data.url = map;
          }
          break;
        case 'timer':
          if (iso) { data.event_date = iso; data.timezone = data.timezone || 'Asia/Almaty'; }
          break;
        case 'calendar-pro':
          if (iso) { data.event_date = iso; data.event_time = time; }
          break;
        case 'calendar':
          if (iso) {
            const first = (data.event_dates && data.event_dates[0]) || { title: null, description: null };
            data.event_dates = [{ ...first, date: f.date, time }];
            data.event_date = iso;
            data.event_time = time;
          }
          break;
        case 'scroll-timeline':
          if (iso) {
            const days = new Date(y, mo, 0).getDate();
            data.dayNumber = String(d);
            data.dayRange = [-2, -1, 0, 1, 2].map(k => d + k).filter(n => n >= 1 && n <= days).map(String);
          }
          break;
        case 'audio':
        case 'audio-fixed':
          if (f.music) data.audio_url = f.music;
          break;
        case 'form':
        case 'form2':
        case 'form3':
          data.form_id = 'f-' + String(c.id || '').replace(/[^a-z0-9]/gi, '').slice(-12);
          break;
      }
      return true;
    });
  }
  return blocks;
}

// Готовые данные для страницы приглашения
// raw — шаблон как есть, с метками (для сравнения раскладки)
function render(tpl, input, { raw = false } = {}) {
  const f = raw ? {} : sanitize(input);
  return {
    template_id: tpl.id, lang: tpl.lang || 'kz', category: tpl.category,
    title: f.title || '', names: [f.name1, f.name2].filter(Boolean), date: f.date || null, time: f.time || null, city: f.city || null,
    envelope: tpl.envelope, blocks: raw ? structuredClone(tpl.blocks) : fill(tpl, f),
  };
}

module.exports = { tokensOf, templateMusic, sampleFields, render };
