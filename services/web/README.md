# web — веб-страницы

HTML-страницы и фронтенд: генератор (`/`), приглашение (`/i/:id` — одобренная версия; `?draft` — черновик
автору и админу, cookie пересылается в invitations), предпросмотр без сохранения (`POST /preview`),
админка (`/admin`, данные она берёт из API auth и invitations), альбом (`/i/:id/album`),
пример шаблона (`/t/:id`), посадочные страницы (`/kz/…`, `/ru/…`), `robots.txt`, `sitemap.xml`.
Своих данных нет: берёт их через API каталога (`/api/templates…`, `/render`) и API приглашений.
SEO — `src/seo.js`. Фронтенд — `public/` (рендер приглашений: `invite.js`, `invite.css`).

## Окружение
`PORT`, `HOST`, `CATALOG_API`, `INVITATIONS_API`, `PUBLIC_URL` (адрес сайта для ссылок в SEO и превью),
`SITE_NAME`, `DEFAULT_LANG`, `PUBLIC_DIR` (по умолчанию `./public`),
`CONTACT_WHATSAPP` (номер для чеков и индивидуального дизайна, цифрами: `77780122500`; пусто — блок не показывается),
`PAYMENT_DETAILS` (как оплатить, например «Kaspi Gold +7 … (Имя Ф.)»; пусто — реквизиты уточняют в WhatsApp).
