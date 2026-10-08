// Поля приглашения: что принимаем от пользователя и как проверяем
const FIELDS = ['template_id', 'title', 'name1', 'name2', 'age', 'date', 'time', 'city', 'address',
  'map_link', 'hosts', 'invite_text', 'music'];
// длина подобрана под рамки шаблонов: длиннее текст в рамку уже не помещается
const LIMITS = { title: 80, name1: 40, name2: 40, age: 3, city: 60, address: 200, map_link: 500, hosts: 120, invite_text: 600, music: 200 };

class FieldError extends Error {}

function validDate(s) {
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return false;
  const [y, mo, d] = m.slice(1).map(Number);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return y >= 2000 && y <= 2100 && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

function cleanFields(input) {
  const f = {};
  for (const k of FIELDS) {
    let v = input[k];
    if (v == null) continue;
    v = String(v).replace(/\r\n/g, '\n').trim();
    if (!v) continue;
    if (LIMITS[k] && [...v].length > LIMITS[k]) throw new FieldError(`Поле «${k}» длиннее ${LIMITS[k]} символов`);
    f[k] = v;
  }
  if (f.template_id) {
    f.template_id = Number(f.template_id);
    if (!Number.isInteger(f.template_id) || f.template_id <= 0) throw new FieldError('Неверный ID шаблона');
  }
  if (f.date && !validDate(f.date)) throw new FieldError('Неверная дата: нужен формат ГГГГ-ММ-ДД');
  if (f.time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(f.time)) throw new FieldError('Неверное время: нужен формат ЧЧ:ММ');
  if (f.age && !/^\d{1,3}$/.test(f.age)) throw new FieldError('Возраст — число');
  if (f.map_link && !/^https?:\/\//i.test(f.map_link)) f.map_link = 'https://' + f.map_link;
  if (f.map_link) {
    let u;
    try { u = new URL(f.map_link); } catch { throw new FieldError('Неверная ссылка на карту'); }
    if (!/^https?:$/.test(u.protocol) || !u.hostname.includes('.')) throw new FieldError('Неверная ссылка на карту');
  }
  if (f.music && !/^\/media\/[0-9a-f]{2}\/[0-9a-f]+\.(mp3|m4a|ogg|wav)$/i.test(f.music)) delete f.music;
  return f;
}

module.exports = { FIELDS, cleanFields, FieldError };
