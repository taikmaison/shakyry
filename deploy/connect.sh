#!/usr/bin/env bash
# Подключение компьютера администратора к серверу (запускается по SSH из deploy-скрипта на Windows).
# stdin: 1-я строка — «DATABASE_URL=postgres://…» или пустая, 2-я — публичный SSH-ключ или пустая.
# Ключ дописывается в /root/.ssh/authorized_keys (дальше вход без пароля), DATABASE_URL — в .env, сервисы перезапускаются.
set -euo pipefail
cd "$(dirname "$0")/.."
IFS= read -r DB || true
IFS= read -r KEY || true
DB=${DB%$'\r'}; KEY=${KEY%$'\r'}

if [[ "$KEY" == ssh-* ]]; then
  mkdir -p /root/.ssh && chmod 700 /root/.ssh
  touch /root/.ssh/authorized_keys && chmod 600 /root/.ssh/authorized_keys
  grep -qxF "$KEY" /root/.ssh/authorized_keys || echo "$KEY" >> /root/.ssh/authorized_keys
  echo "SSH-ключ добавлен: дальше вход с этого компьютера без пароля"
fi

if [[ "$DB" =~ ^DATABASE_URL=postgres(ql)?:// ]]; then
  sed -i '/^DATABASE_URL=/d' .env
  printf '%s\n' "$DB" >> .env
  echo "DATABASE_URL записан — перезапуск сервисов"
  docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
elif [ -n "$DB" ]; then
  echo "Первая строка не похожа на DATABASE_URL=postgres://… — база не изменена"
fi
