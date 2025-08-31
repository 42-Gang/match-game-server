# 1. Build Stage
FROM node:22-alpine AS builder
WORKDIR /app

RUN corepack enable \
 && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

COPY . .

RUN pnpm run build:ts

# 2. Production Stage
FROM node:22-alpine AS runner
WORKDIR /usr/src/app

RUN corepack enable \
 && corepack prepare pnpm@latest --activate

# package.json, lockfile 복사 후 devDependencies 포함 설치
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

COPY --from=builder /app/dist ./dist

EXPOSE 3000

ENTRYPOINT ["/bin/sh", "-c", "pnpm run prod"]
