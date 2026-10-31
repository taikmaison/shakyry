// Формат шаблона и сборка приглашения из него: метки шаблона заменяются данными.
//
// Метки в шаблонах:
//   тексты:  TITLE / Title, жених, невеста, name / ИМЯ, CITY, ADDRESS, HOST, INVITE_TEXT, AGE, DATE, FULL_TIME,
//            ИМЯНЫҢ — имя в родительном падеже (ілік септік): «Аружанның», «Айгүлдің», «Айбектің»
//   data.__needs: 'поле' — компонент только при заполненном поле; data.__without: 'поле' — только при пустом
//            (готовый текст шаблона вместо незаполненного INVITE_TEXT)
//   кнопка карты: https://example.com или ссылка на 2GIS / Google Maps
//   дата: timer.event_date, calendar-pro.event_date/event_time, calendar.event_dates[0], scroll-timeline
//   музыка: audio-fixed.audio_url, audio.audio_url

const TEXT_TOKENS = {
  'TITLE': 'title', 'Title': 'title',
  'жених': 'name1', 'Жених': 'name1', 'ЖЕНИХ': 'name1',
  'name': 'name1', 'Name': 'name1', 'NAME': 'name1', 'ИМЯ': 'name1',
  'невеста': 'name2', 'Невеста': 'name2', 'НЕВЕСТА': 'name2',
  'CITY': 'city', 'ADDRESS': 'address', 'HOST': 'hosts', 'INVITE_TEXT': 'invite_text', 'AGE': 'age',
  'DATE': '_date', 'FULL_TIME': '_time', 'ИМЯНЫҢ': '_name1_gen',
  // заготовки, которые дизайнеры шаблонов оставили обычным текстом
  'Имя': 'name1', 'Имя1': 'name1', 'Имя2': 'name1', 'КАТЕГОРИЯ': 'title', 'Категория': 'title', 'Ваш текст здесь': 'invite_text',
};
const LONE_DATE = /^\d{1,2}[.\/]\d{1,2}[.\/]\d{4}$/;   // «22.12.2026» — чужая дата из примера шаблона
// «жених & невеста» встречается и внутри строки
const INLINE = /(^|[^\p{L}])(жених|невеста|Жених|Невеста)(?=$|[^\p{L}])/gu;
const MAP_URL = /example\.com|2gis\.|google\.[a-z.]+\/(maps|\?q=)|maps\.google|maps\.app\.goo\.gl|goo\.gl\/maps|yandex\.[a-z]+\/maps/i;
const FIELDS = ['title', 'name1', 'name2', 'age', 'date', 'time', 'city', 'address', 'map_link', 'hosts', 'invite_text', 'music'];
const FIELD_OF = { _name1_gen: 'name1' };   // производная метка → поле формы

// Примеры для превью и подсказок в форме — свои, нейтральные
const TITLES = {
  kz: { wedding: 'Үйлену тойына шақыру', bachelorette: 'Қыз ұзату тойына шақыру', merey: 'Мерейтойға шақыру', birthday: 'Туған күнге шақыру',
    sundet: 'Сүндет тойына шақыру', tilashar: 'Тілашар тойына шақыру', besik: 'Бесік тойына шақыру', kudalyk: 'Құдалыққа шақыру',
    syrga_salu: 'Сырға салу тойына шақыру', betashar: 'Беташарға шақыру', kyryk: 'Қырқынан шығару тойына шақыру',
    shildekhana: 'Шілдеханаға шақыру', konys: 'Қоныс тойына шақыру', nikah: 'Неке қию рәсіміне шақыру', ramadan: 'Ауызашарға шақыру',
    reception: 'Тойға шақыру', 'nişan': 'Құдалыққа шақыру', 'merey-sundet': 'Қос қуанышқа шақыру', baptism: 'Тойға шақыру',
    tusaukeser: 'Тұсаукесер тойына шақыру', as_beru: 'Асқа шақыру', svidanie: 'Кездесуге шақыру' },
  ru: { wedding: 'Приглашение на свадьбу', birthday: 'Приглашение на день рождения', merey: 'Приглашение на юбилей',
    bachelorette: 'Приглашение на кыз узату', sundet: 'Приглашение на сундет той', reception: 'Приглашение на торжество',
    svidanie: 'Приглашение на свидание' },
};
const SAMPLE = {
  kz: { name1: 'Айдос', name2: 'Аружан', age: '60', city: 'Алматы', address: '«Той сарайы» мейрамханасы\nАбай даңғылы, 1',
    hosts: 'Ата-анасы', invite_text: 'Сіздерді ақ дастарханымыздың қадірлі қонағы болуға шақырамыз!' },
  ru: { name1: 'Айдос', name2: 'Аружан', age: '60', city: 'Алматы', address: 'Ресторан «Той сарайы»\nпр. Абая, 1',
    hosts: 'Родители', invite_text: 'Приглашаем вас разделить с нами этот радостный день!' },
};

// свои примеры для видов, где праздничный пример неуместен
const SAMPLE_BY_CAT = { kz: { as_beru: { name1: 'Әбдіғаппар Сәрсенбайұлы', hosts: 'Балалары мен немерелері',
  invite_text: 'Сіздерді марқұм әкеміз Әбдіғаппар Сәрсенбайұлының бір жылдық асына келіп, Құран бағыштауға шақырамыз.' },
  // қыз ұзату: имя девушки (иначе в примере — мужское имя из общего образца)
  bachelorette: { name1: 'Аружан', name2: '', hosts: 'Ата-анасы: Ерлан – Гүлнәр',
    invite_text: 'Сіздерді аяулы қызымыз Аружанның ұзату тойына арналған салтанатты ақ дастарханымыздың қадірлі қонағы болуға шақырамыз!' },
  // мерей + сүндет (свой шаблон #9032): придуманные имена — у юбиляра возраст, у мальчиков — два имени
  'merey-sundet': { name1: 'Ерлан (50 жас)', name2: 'Әлихан мен Нұрислам', hosts: 'Ерлан – Гүлнәр',
    invite_text: 'Сіздерді Ерланның 50 жас мерейтойы мен ұлдарымыз Әлихан мен Нұрисламның сүндет тойына арналған салтанатты ақ дастарханымыздың қадірлі қонағы болуға шақырамыз!' } },
  ru: { svidanie: { name1: 'Аружан', name2: '', hosts: 'Арман', address: 'Ресторан «Той сарайы»\nпр. Абая, 1',
    invite_text: 'Приглашаю тебя на ужин. Хочу провести этот вечер с тобой — тёплая атмосфера, вкусная еда и долгие разговоры.' } } };

function sampleFields(tpl) {
  const lang = tpl.lang === 'ru' ? 'ru' : 'kz';
  const d = new Date(Date.now() + 60 * 864e5);
  return {
    ...SAMPLE[lang],
    ...(((SAMPLE_BY_CAT[lang] || {})[tpl.category]) || {}),
    // қыз ұзату: большинство шаблонов архива пишут имя девушки во второе поле («невеста») — туда и пример
    ...(tpl.category === 'bachelorette' && lang === 'kz' && !tokensOf(tpl).includes('name1') ? { name1: '', name2: 'Аружан' } : {}),
    // у шаблона есть готовый текст на случай пустого поля — превью показывает его
    ...(defaultTextParts(tpl).length ? { invite_text: '' } : {}),
    title: (TITLES[lang] && TITLES[lang][tpl.category]) || TITLES[lang].wedding,
    date: d.toISOString().slice(0, 10), time: tpl.category === 'as_beru' ? '13:00' : tpl.category === 'svidanie' ? '20:00' : tpl.category === 'merey-sundet' ? '19:00' : '18:00', map_link: 'https://2gis.kz',
  };
}

// метка → поле, без учёта регистра: в части шаблонов метки написаны как «host», «имя», «категория», «invite_text»
const TOKENS_LC = Object.fromEntries(Object.entries(TEXT_TOKENS).map(([k, v]) => [k.toLowerCase(), v]));
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const tokenOf = key => own(TEXT_TOKENS, key) ? TEXT_TOKENS[key] : own(TOKENS_LC, key.toLowerCase()) ? TOKENS_LC[key.toLowerCase()] : null;

const pad = n => String(n).padStart(2, '0');
const components = tpl => (tpl.blocks || []).flatMap(b => b.components || []);

// Ілік септік (родительный падеж) имени: окончание по последнему звуку и сингармонизму.
//   гласная, м, н, ң → -ның/-нің (Аружанның, Дананың, Сезімнің); л, р, й, у, и, ж, з → -дың/-дің (Айгүлдің, Айсұлудың, Әлидің);
//   остальные согласные → -тың/-тің (Айбектің, Томиристің). Твёрдый/мягкий вариант — по последней гласной слова:
//   и — мягкая (Әлидің, Томиристің), у — двоякая (смотрим гласную перед ней: Айсұлудың), после ь — мягкий.
//   Не кириллица в конце или окончание уже есть — как есть.
const BACK = 'аоұыяёю', FRONT = 'әөүіеэи';
function genitive(name) {
  const s = String(name || '').trim();
  const low = s.toLowerCase();
  const m = low.match(/(\p{Script=Cyrillic}+)$/u);
  if (!m || /(ның|нің|дың|дің|тың|тің)$/.test(low)) return s;
  const word = m[1];
  let last = word[word.length - 1], soft = false;
  if (last === 'ь' || last === 'ъ') { soft = last === 'ь'; last = word[word.length - 2] || ''; }
  const vowel = [...word].reverse().find(ch => BACK.includes(ch) || FRONT.includes(ch));
  const front = soft || (!!vowel && FRONT.includes(vowel));
  const head = 'лрйуижз'.includes(last) ? 'д' : (BACK + FRONT).includes(last) || 'мнң'.includes(last) ? 'н' : 'т';
  const suffix = head + (front ? 'ің' : 'ың');
  return s + (s === s.toUpperCase() && s !== low ? suffix.toUpperCase() : suffix);
}

// готовый текст шаблона на случай пустого INVITE_TEXT (компоненты с __without: 'invite_text')
const defaultTextParts = tpl => components(tpl).filter(c => c.data && c.data.__without === 'invite_text' && typeof c.data.content === 'string');
// он же одной строкой для подсказки в форме — с именем из примера
function defaultText(tpl) {
  const parts = defaultTextParts(tpl);
  if (!parts.length) return '';
  const ex = sampleFields(tpl);
  const v = { ...ex, _name1_gen: genitive(ex.name1) };
  return parts.map(c => replaceText(c.data.content, v)).join(' ').replace(/\s+/g, ' ').trim();
}

// незаполненное поле — пустой текст: гость не должен видеть служебные метки
function replaceText(content, v) {
  const key = content.trim(), token = tokenOf(key);
  if (token) return v[token] || '';
  if (LONE_DATE.test(key)) return v._date || '';
  return content.replace(INLINE, (m, pre, word) => pre + (v[TEXT_TOKENS[word]] || ''));
}

// Какие поля нужны шаблону — форма показывает только их
function tokensOf(tpl) {
  const found = new Set(['title', 'date', 'time']);
  for (const c of components(tpl)) {
    const d = c.data || {};
    if (typeof d.content === 'string') {
      const token = tokenOf(d.content.trim());
      if (token) found.add(FIELD_OF[token] || token);
      for (const m of d.content.matchAll(INLINE)) found.add(TEXT_TOKENS[m[2]]);
    }
    if (c.type === 'button' && (!d.url || MAP_URL.test(d.url))) { found.add('map_link'); found.add('city'); found.add('address'); }
    if (c.type === 'audio' || c.type === 'audio-fixed') found.add('music');
  }
  found.delete('_date'); found.delete('_time');
  // дату выбирает сам гость (приглашение на свидание) — в форме её нет
  if (tpl.guest_date) found.delete('date');
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
  const v = { ...f, _date: f.date ? `${pad(d)}.${pad(mo)}.${y}` : '', _time: time, _name1_gen: genitive(f.name1) };
  const map = mapLink(f);

  for (const block of blocks) {
    block.components = (block.components || []).filter(c => {
      const data = c.data || (c.data = {});
      // __needs: подпись или украшение при поле (например, «сүндет тойы» под вторым именем) — без поля не показываем
      if (data.__needs && !v[data.__needs]) return false;
      // __without: готовый текст шаблона — только пока клиент не написал свой
      if (data.__without && v[data.__without]) return false;
      // __fit: рендер уменьшает шрифт только у текстов с подставленными данными (как оригинал — остальные не трогает)
      // и у тех, что генератор своих шаблонов пометил сам (заголовок в две строки на узком экране)
      if (typeof data.content === 'string') {
        const filled = replaceText(data.content, v);
        data.__fit = data.__fit === true || filled !== data.content;
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

module.exports = { tokensOf, templateMusic, sampleFields, defaultText, genitive, render };
