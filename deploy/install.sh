#!/usr/bin/env bash
# Установка и обновление сайта на сервере Ubuntu/Debian (под root).
#   1) mkdir -p /opt/shakyry && nano /opt/shakyry/.env     — вставить настройки (DOMAIN, PUBLIC_URL, токен бота, …)
#   2) curl -fsSL https://raw.githubusercontent.com/taikmaison/shakyry/main/deploy/install.sh | bash
# Повторный запуск той же командой — обновление до последней версии из GitHub (данные в томах Docker не трогаются).
set -euo pipefail
DIR=${DIR:-/opt/shakyry}
REPO=${REPO:-https://github.com/taikmaison/shakyry.git}
say() { printf '\n\033[1m== %s\033[0m\n' "$*"; }

[ "$(id -u)" = 0 ] || { echo "Запустите под root (или через sudo)"; exit 1; }

if ! command -v git >/dev/null || ! command -v curl >/dev/null; then
  say "Ставлю git и curl"
  apt-get update -qq && apt-get install -y -qq git curl ca-certificates
fi
if ! command -v docker >/dev/null; then
  say "Ставлю Docker"
  curl -fsSL https://get.docker.com | sh
fi

# мало памяти — файл подкачки на 2 ГБ, чтобы сборка и сервисы не упирались в лимит
if [ "$(awk '/MemTotal/{print int($2/1024)}' /proc/meminfo)" -lt 3000 ] && [ -z "$(swapon --show)" ]; then
  say "Добавляю swap 2 ГБ"
  if fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile >/dev/null && swapon /swapfile; then
    grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  else
    rm -f /swapfile; echo "swap не добавлен — продолжаю без него"
  fi
fi

say "Код из GitHub → $DIR"
mkdir -p "$DIR"
[ -d "$DIR/.git" ] || { git -C "$DIR" init -q && git -C "$DIR" remote add origin "$REPO"; }
git -C "$DIR" fetch -q --depth 1 origin main
git -C "$DIR" checkout -q -f -B main FETCH_HEAD   # .env не в git — остаётся как есть
cd "$DIR"

if [ ! -f .env ]; then
  echo "Нет файла $DIR/.env. Создайте его: nano $DIR/.env (вставьте настройки), затем запустите эту команду снова."
  exit 1
fi
sed -i 's/\r$//' .env   # вставка из Windows — убрать \r в концах строк
for k in DOMAIN PUBLIC_URL AUTH__TELEGRAM_BOT_TOKEN; do
  grep -Eq "^$k=.+" .env || { echo "В $DIR/.env не заполнено $k"; exit 1; }
done

# если включён ufw — открыть веб-порты (SSH не трогаем)
if command -v ufw >/dev/null && ufw status 2>/dev/null | grep -q 'Status: active'; then ufw allow 80/tcp >/dev/null; ufw allow 443/tcp >/dev/null; fi

say "Сборка и запуск (первый раз — несколько минут: скачиваются шаблоны и музыка)"
DC="docker compose -f docker-compose.yml -f docker-compose.prod.yml"
$DC up -d --build --remove-orphans
docker image prune -f >/dev/null || true

say "Проверка"
ok=""
for i in $(seq 1 30); do
  if $DC exec -T gateway wget -qO- http://127.0.0.1:3000/api/templates >/dev/null 2>&1; then ok=1; break; fi
  sleep 2
done
$DC ps --format 'table {{.Service}}\t{{.Status}}'
DOMAIN=$(grep -E '^DOMAIN=' .env | head -1 | cut -d= -f2- | tr -d '"'"'"' ')
if [ -n "$ok" ]; then
  echo
  echo "Сайт запущен. Адрес: https://$DOMAIN"
  echo "HTTPS-сертификат Caddy получит сам, как только домен будет указывать на IP этого сервера ($(hostname -I 2>/dev/null | awk '{print $1}'))."
  echo "Логи: cd $DIR && $DC logs -f --tail=50"
else
  echo "Сайт не ответил за минуту — смотрите логи: cd $DIR && $DC logs --tail=80"
  exit 1
fi
