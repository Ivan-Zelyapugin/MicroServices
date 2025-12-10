# Этап сборки
FROM node:20 AS build
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Этап отдачи статики — Traefik сам отдаёт через file server
FROM alpine:3.19
WORKDIR /static

# Копируем собраный фронт
COPY --from=build /app/build .

# dummy entrypoint (контейнер просто хранит файлы)
CMD ["nginx", "-g", "daemon off;"]
