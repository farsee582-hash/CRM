FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY client/package*.json ./client/
RUN cd client && npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["node", "server/index.js"]
