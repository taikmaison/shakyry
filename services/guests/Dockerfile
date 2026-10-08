FROM node:24-alpine
WORKDIR /app
COPY . .
ENV HOST=0.0.0.0 PORT=3000
EXPOSE 3000
CMD ["node", "--disable-warning=ExperimentalWarning", "src/index.js"]
