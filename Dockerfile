FROM node:22-slim AS builder

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY prisma/ ./prisma/
COPY prisma.config.ts ./
RUN npx prisma generate

COPY tsconfig.json vite.config.ts index.html ./
COPY src/ ./src/
COPY public/ ./public/
COPY .env.example ./.env

RUN npx vite build

FROM node:22-slim

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm install tsx prisma @prisma/client @prisma/adapter-mariadb

COPY prisma/ ./prisma/
COPY prisma.config.ts ./
RUN npx prisma generate

COPY server/ ./server/
COPY --from=builder /app/dist ./dist/
COPY --from=builder /app/generated ./generated/

ENV PORT=3001
ENV FIELDWORK_STATIC_ROOT=/app/dist
ENV NODE_ENV=production

EXPOSE 3001

CMD ["npx", "tsx", "server/index.ts"]
