FROM node:20-alpine
WORKDIR /usr/src/app
COPY package.json package-lock.json* ./
RUN npm ci --only=production || npm install --production
COPY src ./src

ENV NODE_ENV=production
EXPOSE 9000
CMD ["node", "src/server.js"]
