FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build || echo "skip if TS directly"

EXPOSE 4000
CMD ["npm", "run", "dev"]
