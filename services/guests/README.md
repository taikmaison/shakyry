# guests — гости

Ответы на анкету и пожелания. База — SQLite в `data/guests.db`.
Принимает ответы только для опубликованных приглашений (проверяет через API приглашений).
Слушает событие `invitation.deleted`.

Ответ раскладывается по тексту кнопки (`src/rsvp.js`): `yes`, `plus_one` (с парой), `no`, `unknown` —
значениям кнопок в шаблонах верить нельзя. Повторный ответ с того же устройства (`guest_key`)
заменяет прежний. Сводка: `people = yes + 2 × plus_one`.

## API
| Метод | Путь | Что делает |
|---|---|---|
| POST | `/api/i/:id/rsvp` | ответ гостя `{form_id, guest_key, action, action_text, fields}` → `{status}`; владельцу — уведомление |
| GET | `/api/i/:id/answers` | `{summary, answers}` — только владельцу и админу (права проверяет invitations по cookie) |
| GET | `/api/i/:id/answers.csv` | то же для Excel (UTF-8 с BOM, `;`) |
| GET / POST | `/api/i/:id/wishes` | пожелания / добавить `{name, message}` |
| GET | `/api/guests/stats?ids=a,b` | счётчики и сводка |
| POST | `/events` | события (шлюз снаружи не пускает) |

## Окружение
`PORT`, `HOST`, `DB_FILE`, `INVITATIONS_API`, `AUTH_API` (уведомления; без него не шлются).
