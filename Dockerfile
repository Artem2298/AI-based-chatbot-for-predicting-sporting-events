FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma/
RUN npm ci

COPY tsconfig.json ./
COPY src ./src/
RUN npm run build

FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma/
RUN npm ci --omit=dev && npx prisma generate

COPY --from=builder /app/dist ./dist/

# Copy Prisma Client
COPY --from=builder /app/src/generated/prisma ./dist/generated/prisma/

# Copy runtime assets
COPY src/locales ./src/locales/
COPY src/prompts ./src/prompts/

EXPOSE 8080

CMD ["node", "dist/index.js"]
