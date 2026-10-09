# auth — пользователи и вход

Вход без пароля: **код на почту** или **подтверждение в Telegram-боте**. Сессии, роли
(`user` / `admin`), админка пользователей, уведомления пользователям и администратору.
Ни от кого не зависит. Только встроенные модули Node (SMTP-клиент и Telegram-бот написаны на `net`/`tls`/`fetch`).
База — SQLite (`node:sqlite`) в `data/auth.db` (env `DB_FILE`); если задан `DATABASE_URL` — Postgres (Neon, по HTTPS),
так сервис работает на Vercel, где нет постоянного диска. Схема одна; в Postgres индексы с префиксом `auth_`.

```
node --disable-warning=ExperimentalWarning src/index.js     # или npm start
```

## Пользователь

```json
{ "id": 1, "email": "a@mail.kz", "telegram_id": null, "telegram_username": null,
  "name": "Айгерім", "role": "user", "created_at": "2026-10-08T12:00:00.000Z" }
```
Есть `email` или `telegram_id`, в зависимости от способа входа. Это разные аккаунты, автоматически они не связываются.
В ответах админки добавляется `blocked: true|false`.

## API

Ошибки — `{ "error": "текст по-русски" }`.

| Метод | Путь | Что делает |
|---|---|---|
| GET | `/api/auth/providers` | `{ email, telegram, bot: "@имя" \| null }` — какие кнопки входа показывать |
| POST | `/api/auth/email/start` | `{ email }` → `{ ok: true, expires_in: 600 }` — шлёт 6-значный код |
| POST | `/api/auth/email/verify` | `{ email, code, name? }` → `{ user }` + cookie; новый адрес — новый пользователь |
| POST | `/api/auth/telegram/start` | → `{ token, url: "https://t.me/<бот>?start=<token>", expires_in: 600 }` |
| GET | `/api/auth/telegram/check?token=` | `{ status: "pending" }` или `{ status: "ok", user }` + cookie |
| POST | `/api/auth/telegram/webhook` | только в режиме webhook: обновление от Telegram → `{ ok: true }`; без верного `X-Telegram-Bot-Api-Secret-Token` — 401, в режиме polling — 404 |
| GET | `/api/auth/me` | `{ user }` или 401 |
| PATCH | `/api/auth/me` | `{ name }` → `{ user }` |
| POST | `/api/auth/logout` | `{ ok: true }`, cookie стирается |
| GET | `/api/admin/users?q=&limit=&offset=` | `{ total, users }`, только админ |
| PATCH | `/api/admin/users/:id` | `{ blocked }` → `{ user }`, только админ |
| POST | `/_internal/notify` | `{ user_id, text, subject? }` → `{ sent: "telegram" \| "email" \| null }` |
| POST | `/_internal/notify-admins` | `{ text, subject? }` → `{ sent: <число получателей> }` |
| GET | `/health` | `{ service: "auth", ok: true }` |

### Вход по почте
- Код: 6 цифр, живёт 10 минут. В базе хранится только HMAC кода. Новый запрос заменяет прежний код.
- Ограничения на `email/start`: не чаще 1 раза в 60 с на адрес, не больше 5 в час на адрес и 20 в час на IP.
  При превышении — **429** и заголовок `Retry-After`. IP берётся из `x-forwarded-for` (его ставит шлюз), без шлюза — адрес сокета.
- `email/verify`: **400** — некорректный адрес или код не из 6 цифр; **401** — «Неверный код. Осталось попыток: N»;
  после 5 неверных попыток код сгорает. **410** — кода нет, он истёк или сгорел («запросите новый»). **403** — аккаунт заблокирован.
- `name` нужен только при первом входе. Если его нет, берётся часть адреса до `@`. Имя: 1–60 символов.
- Письмо (kz + ru): тема «Кіру коды / Код для входа: 123456», текст «Код для входа: 123456. Действует 10 минут.»
- SMTP не настроен: код пишется в лог сервиса. С `DEV_LOGIN_CODES=1` он ещё и возвращается в ответе `start`
  как `dev_code` (только для разработки; если SMTP настроен, `dev_code` не отдаётся никогда).
- Письмо не ушло: **503** «Не удалось отправить письмо — попробуйте позже», причина пишется в лог (без пароля SMTP).

### Вход через Telegram
1. Фронтенд вызывает `POST /api/auth/telegram/start` и открывает `url`.
2. Пользователь нажимает «Старт» в боте. Сервис получает обновление (long-polling или webhook, см. ниже),
   помечает токен подтверждённым и отвечает в чат «Вход подтверждён — вернитесь на сайт».
3. Фронтенд раз в 1–2 с опрашивает `GET /api/auth/telegram/check?token=…`. После подтверждения сервис находит
   или создаёт пользователя по `telegram_id` (имя — из Telegram, ник обновляется при каждом входе), ставит cookie
   и отвечает `{ status: "ok", user }`. Токен одноразовый. Истёкший, неизвестный или уже использованный → **410**.
- Без `TELEGRAM_BOT_TOKEN` (или если Telegram не принял токен) эти эндпоинты отвечают **503** «Вход через Telegram не настроен».

**Как сервис получает сообщения боту** — один из двух режимов:
- **long-polling** (по умолчанию, VPS): сервис сам читает `getUpdates` (timeout 25 с; при сбоях пауза и повтор, не падает).
  Webhook у бота должен быть выключен: иначе `getUpdates` отвечает 409 (это видно в логе). Снять: `deleteWebhook` в Bot API.
- **webhook** — при `TELEGRAM_WEBHOOK=1` и всегда на Vercel (`VERCEL=1`): Telegram сам присылает обновления в
  `POST /api/auth/telegram/webhook`, `getUpdates` не вызывается. Адрес — `TELEGRAM_WEBHOOK_URL`, иначе
  `PUBLIC_URL` + `/api/auth/telegram/webhook` (только `https://`, порт 443/80/88/8443). При старте сервис вызывает
  `getWebhookInfo` и `setWebhook` (с `secret_token`, `allowed_updates: ["message"]`), только если адрес другой
  (или Telegram получал от нас 401 — значит, сменился секрет). Секрет — `TELEGRAM_WEBHOOK_SECRET`, а если не задан —
  выводится из токена бота (HMAC-SHA256, 64 hex-символа), одинаковый на всех экземплярах. Заголовок
  `X-Telegram-Bot-Api-Secret-Token` сверяется за постоянное время. Ответ 200 уходит только после обработки
  (запись в базу и ответ в чат) — на Vercel работа после ответа может не завершиться.
- У одного бота — один режим и один адрес webhook. Для превью и локального запуска заведите отдельного бота:
  иначе превью перехватит webhook боевого сайта, а локальный polling будет получать 409.

### Сессия
- Cookie: `sid=<токен>; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000`, плюс `Secure` при `COOKIE_SECURE=1`.
- Токен — 32 случайных байта (base64url). В базе хранится только sha256. Срок 30 дней; если при использовании осталось
  меньше 15 дней, срок продлевается до 30. `GET /api/auth/me` по cookie заодно обновляет срок cookie в браузере.
- Сессия читается из cookie `sid` **или** `Authorization: Bearer <sid>`.

**Как другим сервисам узнать пользователя:** переслать сюда cookie пользователя:
`GET <AUTH_API>/api/auth/me` с заголовком `Cookie: sid=…`. Ответ: `200 { user }`, или `401` (не вошёл / сессия
истекла / заблокирован). Так работает `currentUser()` в `lib/http.js` сервисов.

### Администратор
Администратор ровно **один**, это владелец сайта. Стать админом через вход или API нельзя: все новые пользователи — `user`,
а `PATCH /api/admin/users/:id` с полем `role` возвращает 400 «Роль меняется только командой на сервере».
В базе это гарантирует уникальный индекс `one_admin`. Назначение — только командой на сервере:

```
node tools/make-admin.js owner@mail.kz            # по почте
node tools/make-admin.js @erkebai1225             # по нику Telegram (без учёта регистра)
node tools/make-admin.js 123456789                # по числовому telegram id
node tools/make-admin.js @newowner --replace      # передать роль: прежний админ станет user
```
- Пользователь должен уже существовать (один раз войти на сайт), иначе будет ошибка «Сначала войдите на сайт…».
- Роль ставится на запись пользователя, то есть по сути на его `telegram_id`. Если потом сменить ник, роль останется.
- Если админ уже есть и это другой пользователь, команда откажет. Чтобы передать роль, нужен флаг `--replace`.
- Команда работает напрямую с базой (`DB_FILE` или `data/auth.db`), сервис можно не останавливать.
  В Docker: `docker compose exec auth node tools/make-admin.js …`.
- Сайт на Vercel (база Postgres): команда запускается со своего компьютера с тем же `DATABASE_URL`:
  ```
  vercel env pull .env.vercel                                    # переменные проекта (файл не коммитить!)
  node --env-file=.env.vercel tools/make-admin.js @erkebai1225
  ```
  В PowerShell можно и так: `$env:DATABASE_URL='postgres://…'; node tools/make-admin.js @erkebai1225`.

Админка: `GET /api/admin/users`. Поиск `q` — по имени, почте, `@нику` (без учёта регистра); если ввести число —
ещё и по telegram id и id пользователя. Сортировка: новые сверху. `limit` по умолчанию 50, не больше 200.
`PATCH /api/admin/users/:id { blocked: true|false }` блокирует или разблокирует пользователя. Все его сессии
удаляются, войти он больше не может (403). Администратора заблокировать нельзя.
Без сессии — 401, не админ — 403.

### Уведомления (для других сервисов)
`/_internal/…` снаружи закрывает шлюз. Уведомление уходит в Telegram, если у пользователя есть `telegram_id`
и бот работает. Иначе (или если Telegram не доставил) — письмом, если есть почта и SMTP.
Заблокированным пользователям ничего не отправляется. Текст обрезается до 4000 символов. Тема письма по умолчанию —
«Хабарландыру / Уведомление».

## Окружение
| Переменная | Что это |
|---|---|
| `PORT`, `HOST` | адрес сервиса |
| `DB_FILE` | файл базы SQLite, по умолчанию `data/auth.db` |
| `DATABASE_URL` | `postgres://…` (Neon) — вместо SQLite база Postgres по HTTPS (Vercel); общая для всех сервисов |
| `COOKIE_SECURE` | `1` — cookie только по HTTPS (на боевом сайте) |
| `SMTP_HOST`, `SMTP_PORT` | SMTP-сервер; порт 465 — сразу TLS, 587 — STARTTLS (обязателен) |
| `SMTP_SECURE` | `1` — сразу TLS на нестандартном порту |
| `SMTP_USER`, `SMTP_PASS` | вход AUTH PLAIN/LOGIN (без TLS пароль отправляется только на localhost) |
| `SMTP_FROM` | отправитель: `Шақыру <no-reply@site.kz>`; если не задан — `SMTP_USER` |
| `DEV_LOGIN_CODES` | `1` — без SMTP код возвращается в ответе (только для разработки) |
| `TELEGRAM_BOT_TOKEN` | токен бота от @BotFather |
| `TELEGRAM_API_URL` | адрес Bot API, по умолчанию `https://api.telegram.org` (для локального Bot API или тестов) |
| `TELEGRAM_WEBHOOK` | `1` — режим webhook вместо long-polling; на Vercel (`VERCEL=1`) включён всегда |
| `TELEGRAM_WEBHOOK_URL` | полный `https://` адрес webhook; по умолчанию `PUBLIC_URL` + `/api/auth/telegram/webhook` |
| `PUBLIC_URL` | адрес сайта (`https://site.kz`) — из него строится адрес webhook, если `TELEGRAM_WEBHOOK_URL` не задан |
| `TELEGRAM_WEBHOOK_SECRET` | секрет webhook: 1–256 символов `A-Z a-z 0-9 _ -`; по умолчанию выводится из токена бота |

Уборка просроченных сессий, кодов, ссылок входа и счётчиков — не чаще раза в 10 минут: по таймеру и заодно
из запросов (на Vercel между запросами таймеры не работают). Просроченное и так не принимается — уборка только чистит базу.
