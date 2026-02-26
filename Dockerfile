# ---- Build stage ----
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
COPY prisma ./prisma/
RUN npm ci

# Copy source and build
COPY tsconfig.json ./
COPY src ./src/
RUN npm run build

# ---- Production stage ----
FROM node:20-alpine

WORKDIR /app

# Install production dependencies only
COPY package.json package-lock.json ./
COPY prisma ./prisma/
RUN npm ci --omit=dev && npx prisma generate

# Copy compiled JS from builder
COPY --from=builder /app/dist ./dist/

# Copy Prisma Client into dist/generated/prisma (where tsc-alias resolves it)
COPY --from=builder /app/src/generated/prisma ./dist/generated/prisma/

# Copy runtime assets (locales + prompts loaded via process.cwd()/src/...)
COPY src/locales ./src/locales/
COPY src/prompts ./src/prompts/

EXPOSE 8080

CMD ["node", "dist/index.js"]
