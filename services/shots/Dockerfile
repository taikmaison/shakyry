FROM node:24-alpine
WORKDIR /app
# Chromium для снимков; шрифты Noto — запасные для кириллицы и казахских букв
RUN apk add --no-cache chromium font-noto
ENV PUPPETEER_SKIP_DOWNLOAD=1
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY . .
# Chromium — не от root; папка снимков (том shots-data) принадлежит пользователю node
RUN mkdir -p /app/data && chown node:node /app/data
USER node
ENV HOST=0.0.0.0 PORT=3000
EXPOSE 3000
CMD ["node", "src/index.js"]
