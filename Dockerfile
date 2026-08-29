FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

COPY start.sh ./
RUN chmod +x start.sh

RUN npx prisma generate && npm run build

EXPOSE 3000

CMD ["./start.sh"]
