# invitations — приглашения

Черновики, модерация и одобренные версии приглашений. База — SQLite в `data/invitations.db`.
Вход проверяет через API auth (пересылает cookie `sid` в `GET /api/auth/me`), шаблон — через API каталога.
О гостях и альбоме не знает: при удалении публикует событие подписчикам.

Статусы: `draft` → (автор отправил) `pending` → (админ) `published` или `rejected`.
Гости видят только одобренный снимок (`live_fields`): правка после публикации снова делает
черновик, а гости до нового одобрения видят прежнюю версию.

## API
| Метод | Путь | Кто | Что делает |
|---|---|---|---|
| GET | `/api/invitations` | вошедший | мои приглашения |
| POST | `/api/invitations` | вошедший | сохранить черновик `{template_id, title, name1, name2, age, date, time, city, address, map_link, hosts, invite_text, music}` |
| PUT | `/api/invitations/:id` | владелец | изменить (статус снова `draft`) |
| POST | `/api/invitations/:id/submit` | владелец | на модерацию; админу уходит уведомление |
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
`EVENT_SUBSCRIBERS` (адреса через запятую, куда слать события).
