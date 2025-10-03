# Этап сборки
FROM node:20 AS build
WORKDIR /app

# копируем package.json и package-lock.json
COPY package*.json ./
RUN npm install

# копируем весь проект и собираем
COPY . .
RUN npm run build

# Этап запуска (nginx отдаёт собранный фронт)
FROM nginx:alpine
WORKDIR /usr/share/nginx/html
COPY --from=build /app/build .

# добавляем конфиг для SPA (чтобы работали роуты React)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
