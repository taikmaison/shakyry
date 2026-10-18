// Приглашение на свидание (раскладка 'date', own/lib/date-layout.js): девушка сама выбирает день в календаре,
// ответ приходит хозяину приглашения в Telegram. Время, место и подпись — из формы сайта.
// Картинки — own/media/svidanie-cover.jpg (обложка), -photo.jpg (столик на двоих), -roses.png (розы, фон вырезан):
// свои, сгенерированы в Google Flow (Nano Banana) для этого шаблона.
module.exports = [
  { id: 9031, slug: 'svidanie', category: 'svidanie', layout: 'date',
    palette: { bg: '#f6ede3', card: '#fffaf4', line: '#d9c3ad', ink: '#3a1d21', accent: '#7a1c2b', accentText: '#7a1c2b', gold: '#b48a52',
      button: '#7a1c2b', buttonText: '#fff7ef', shadow: 'rgba(80, 20, 30, .28)' },
    envelope: ['#3d0c16', '#f7e6cf'],
    text: {
      kicker: 'Приглашение на свидание',
      dear: 'Дорогая',
      chooseTitle: 'Выбор за тобой',
      chooseText: 'Выбери день, когда тебе удобно, — остальное я возьму на себя.',
      dateLabel: 'Дата свидания',
      datePlaceholder: 'Выбери дату…',
      modalTitle: 'Выбери день свидания',
      dateNeeded: 'Сначала выбери дату',
      submit: 'Отправить',
      answerText: 'Согласна',
      thanksText: 'Спасибо! Жду нашей встречи',
      doneText: 'Дата выбрана — до встречи!',
      timeTitle: 'Время',
      placeTitle: 'Место',
      mapButton: 'Открыть в 2GIS',
      dressTitle: 'Дресс-код',
      dress: 'Вечерний образ',
      dressNote: '…хотя ты прекрасна в любом наряде',
      love: 'С любовью,',
    } },
];
