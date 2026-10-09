# invitations — приглашения

Черновики, модерация и одобренные версии приглашений. База — SQLite в `data/invitations.db` или Postgres (Neon), если задан `DATABASE_URL` (Vercel).
Вход проверяет через API auth (пересылает cookie `sid` в `GET /api/auth/me`), шаблон — через API каталога.
О гостях и альбоме не знает: при удалении публикует событие подписчикам.
События и уведомления отправляются до ответа (ждём до 5 с, сбой только в лог): на Vercel контейнер засыпает сразу после ответа.
Дубли черновиков защищены атомарной записью `INSERT … WHERE NOT EXISTS` (в Postgres — под блокировкой автора `pg_advisory_xact_lock`).

Статусы: `draft` → (автор отправил) `pending` → (админ) `published` или `rejected`.
Гости видят только одобренный снимок (`live_fields`): правка после публикации снова делает
черновик, а гости до нового одобрения видят прежнюю версию.

## API
| Метод | Путь | Кто | Что делает |
|---|---|---|---|
| GET | `/api/invitations` | вошедший | мои приглашения |
| POST | `/api/invitations` | вошедший | сохранить черновик `{template_id, title, name1, name2, age, date, time, city, address, map_link, hosts, invite_text, music}` |
| PUT | `/api/invitations/:id` | владелец | изменить (статус снова `draft`) |
| POST | `/api/invitations/:id/submit` | владелец | на публикацию `{agree: true}` — согласие с правилами (публикация платная) обязательно, время хранится в `terms_accepted_at`; админу уходит уведомление |
| GET | `/api/invitations/:id` | все | только одобренная версия, иначе 404 |
| GET | `/api/invitations/:id/draft` | владелец, админ | текущая версия (предпросмотр) |
| GET | `/api/invitations/:id/owner` | владелец, админ | проверка прав — для других сервисов (пересылают cookie) |
| DELETE | `/api/invitations/:id` | владелец, админ | удалить → событие `{type: "invitation.deleted", id}` |
| GET | `/api/admin/invitations?status&q&live&limit&offset` | админ | `{total, counts, invitations}` |
| POST | `/api/admin/invitations/:id/approve` | админ | опубликовать; автору — уведомление |
| POST | `/api/admin/invitations/:id/reject` | админ | отклонить `{reason}` |
| POST | `/api/admin/invitations/:id/unpublish` | админ | снять с публикации `{reason?}` |
| GET | `/_internal/invitations/:id` | сервисы | `{user_id, live, title}` — кому слать уведомления |

## Окружение
`PORT`, `HOST`, `DB_FILE`, `CATALOG_API`, `AUTH_API`, `PUBLIC_URL` (для ссылок в уведомлениях),
`MAX_DRAFTS` (по умолчанию 20),
`EVENT_SUBSCRIBERS` (адреса через запятую, куда слать события); если не задан — `GUESTS_API` и `ALBUM_API`
(базовые адреса сервисов, события уходят на `<адрес>/events`; так на Vercel).
`DATABASE_URL` — Postgres (Neon) вместо файла SQLite.
