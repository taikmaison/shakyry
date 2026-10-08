// Что ответил гость: приду / приду с парой / не приду.
// Значения кнопок в шаблонах ненадёжны (например, «Жұбайыммен бірге барамын» записано как "no"),
// поэтому решаем по тексту кнопки, а значение — только запасной вариант.
const NO = /келе\s*алма|бара\s*алма|қатыса\s*алма|келмей|бармай|не\s*смогу|не\s*приду|не\s*сможем|не\s*придём|к\s*сожалению|өкінішке|кеп\s*алма|can['’]?t|cannot|not\s+(come|attend)|келолмай|kela\s*olmay|bora\s*olmay/i;
const PLUS = /жұбай|жар[ыі]м|серікт|отбасым|бірге|с\s*(супруг|муж|жен|парой|партн|семь)|вдво[её]м|вместе|with\s+(my\s+)?(partner|spouse|wife|husband)|plus\s*one|\+\s*1|жубайым|turmush/i;
const YES = /келем|барам|қатысам|приду|придём|буду|будем|yes|coming|attend|келем|барамын|kelaman|boraman/i;

function byText(t) {
  if (NO.test(t)) return 'no';
  if (PLUS.test(t)) return 'plus_one';
  if (YES.test(t)) return 'yes';
  return null;
}

// fields — для анкет с вопросами (form3): ответ «приду / не приду» лежит среди полей
function classify(actionText, actionValue, fields = {}) {
  const t = String(actionText || '');
  const fromText = t && byText(t);
  if (fromText) return fromText;
  if (!t) for (const v of Object.values(fields)) { const r = byText(String(v || '')); if (r) return r; }
  const v = String(actionValue || '').toLowerCase();
  if (!t && v === 'no') return 'no';
  if (v === 'yes') return 'yes';
  return 'unknown';
}

function summary(answers) {
  const s = { yes: 0, plus_one: 0, no: 0, unknown: 0 };
  for (const a of answers) s[a.status] = (s[a.status] || 0) + 1;
  return { ...s, total: answers.length, people: s.yes + s.plus_one * 2 };
}

module.exports = { classify, summary };
