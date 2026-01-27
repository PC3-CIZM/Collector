FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
<<<<<<< HEAD
=======
COPY nginx.conf /etc/nginx/conf.d/default.conf
>>>>>>> 00e5f317067658cb638802b2a4358b9c834f1f64
EXPOSE 80
