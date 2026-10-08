# album — альбом гостей

Фото с праздника, которые загружают гости. База — SQLite `data/album.db`, файлы — `data/files/`.
Принимает только картинки (проверка по содержимому файла), до 15 МБ.
Зависит от API приглашений. Слушает событие `invitation.deleted` (удаляет фото).

## API
| Метод | Путь | Что делает |
|---|---|---|
| GET / POST | `/api/i/:id/album` | фото / загрузить (multipart: `file`, `name`) — только в опубликованное |
| DELETE | `/api/i/:id/album/:photo` | удалить фото — владелец или админ (права проверяет invitations по cookie) |
| GET | `/files/albums/:id/:file` | файл фото |
| GET | `/api/album/stats?ids=a,b` | счётчики фото |
| POST | `/events` | события (шлюз снаружи не пускает) |

## Окружение
`PORT`, `HOST`, `DATA_DIR`, `INVITATIONS_API`.
