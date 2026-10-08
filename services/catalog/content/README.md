# content — данные каталога

Эта папка не хранится в git: здесь шаблоны, медиа, шрифты и превью (~370 МБ).
Структура:

```
templates.json          каталог шаблонов
templates/<id>.json     шаблон
media/                  картинки, видео, музыка
fonts/, fonts.css       шрифты
previews/<id>.webp|jpg  превью для каталога и соцсетей
prices.json             (необязательно) своя цена для отдельных шаблонов: { "296": 5000 }
```

Заполнить (из папки `services/catalog`):

```
node tools/update.js     скачать шаблоны и медиа
node tools/clean.js      убрать чужую рекламу и контакты
node tools/previews.js   снять превью (нужен запущенный сайт и: cd tools && npm install)
```

Или скачать готовый архив из Google Drive (ссылка — у владельца сайта; в git её не кладите).
Ссылку записать в `.env` в корне проекта: `CONTENT_URL=...`, затем из папки `services/catalog`:

```
node tools/fetch-content.js
```

На сервере без Node — через Docker (из корня проекта):

```
docker run --rm -v "$PWD/services/catalog:/c" -w /c --env-file .env node:24-alpine node tools/fetch-content.js
```

Собрать такой архив заново (Windows, из папки `services/catalog`): `tar.exe -a -c -f ..\..\..\shaqyru-content.zip content`.
