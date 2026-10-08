# catalog — каталог шаблонов

Шаблоны приглашений, сборка приглашения из шаблона, музыка, медиафайлы, шрифты, превью.
Ни от каких сервисов не зависит. Данные — `content/` (только чтение).

## API
| Метод | Путь | Что делает |
|---|---|---|
| GET | `/api/templates` | каталог: `[{id, category, lang, popularity, preview, price, currency}]` |
| GET | `/api/templates/:id` | поля шаблона (`tokens`), пример данных (`sample`), музыка, превью, цена |
| POST | `/api/templates/:id/render` | `{fields}` → данные страницы приглашения; `{sample:true}` — с примером; `{raw:true}` — как есть |
| GET | `/api/music` | музыка шаблонов `[{url, title}]` |
| GET | `/fonts.css`, `/fonts/*`, `/media/*`, `/previews/*` | файлы |
| POST | `/_internal/reload` | перечитать `content/` (шлюз снаружи не пускает) |

## Окружение
`PORT`, `HOST`, `CONTENT_DIR` (по умолчанию `./content`), `PRICE` (цена шаблона, по умолчанию 3500), `CURRENCY` (по умолчанию `KZT`).
Своя цена для отдельных шаблонов — `content/prices.json`: `{ "296": 5000, "301": 0 }`; перечитывается вместе с шаблонами.

## Инструменты
`node tools/update.js` — обновить шаблоны из открытого API; `node tools/clean.js` — очистка шаблонов;
`node tools/previews.js` — превью (нужен puppeteer: `cd tools && npm install`, и запущенный сайт).
