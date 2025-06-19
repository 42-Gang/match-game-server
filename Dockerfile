# 1. Build Stage
FROM node:22-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY src/ ./src/
COPY tsconfig.json ./
COPY package*.json ./
COPY .env* ./

RUN npm run build:ts

# 2. Production Stage
FROM node:22-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist

EXPOSE 3000

# ✅ ENTRYPOINT에서 prisma migrate 실행 (실제 런타임에서 DB 접근 가능할 때!)
ENTRYPOINT ["/bin/sh", "-c", "npm run prod"]
