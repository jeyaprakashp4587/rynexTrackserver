FROM node:22-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev
RUN npm install pm2 -g
COPY . .
EXPOSE 8000
CMD ["node", "server.js","npm run dev"]
