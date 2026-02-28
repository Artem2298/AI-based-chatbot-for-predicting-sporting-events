# AI Sport Prediction Bot

Telegram bot that provides AI-powered football match predictions, and match notifications.

## Stack

- **Runtime:** Node.js + TypeScript
- **Bot framework:** grammY
- **Database:** PostgreSQL + Prisma ORM
- **AI:** Google Gemini API
- **Football data:** football-data.org API
- **Logging:** Pino

## Features

- Match predictions (outcome, total goals, BTTS)
- Team statistics and head-to-head history
- League standings (Premier League, Bundesliga, Serie A, La Liga, Ligue 1)
- Match subscription with pre-match reminders and post-match results
- Prediction accuracy tracking
- Multi-language support (RU, EN, UK, CS, SK, PL)

## Setup

```bash
npm install
npx prisma generate
npx prisma migrate deploy
```

Create `.env` file:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"
DIRECT_URL="postgresql://user:password@localhost:5432/dbname"
FOOTBALL_API_KEY="your-football-data-api-key"
TELEGRAM_BOT_TOKEN="your-telegram-bot-token"
GEMINI_API_KEY="your-gemini-api-key"
LOG_LEVEL="info"
```

## Run

```bash
npm run dev       # development (with hot reload)
npm run build     # compile TypeScript
npm start         # production
```

## Tests

```bash
npm test              # run all tests
npm run test:watch    # watch mode
npm run test:coverage # with coverage report
```

## Deployment

The bot is deployed on [Koyeb](https://www.koyeb.com/) using Docker.

```bash
npm run build     # prisma generate && tsc && tsc-alias
```

Required environment variables on the hosting platform:

| Variable             | Description                        |
| -------------------- | ---------------------------------- |
| `DATABASE_URL`       | PostgreSQL connection string       |
| `DIRECT_URL`         | PostgreSQL direct connection URL   |
| `TELEGRAM_BOT_TOKEN` | Telegram Bot API token             |
| `FOOTBALL_API_KEY`   | football-data.org API key          |
| `GEMINI_API_KEY`     | Google Gemini API key              |
| `NODE_ENV`           | Set to `production`                |
| `PORT`               | HTTP port for health checks (8080) |

A built-in HTTP health check server responds on the configured port to keep the service alive.

## Project Structure

```
src/
  api/            # External API clients (football-data, Gemini)
  bot/            # Bot setup, handlers, keyboards, formatters
  config/         # Environment config with Zod validation
  services/       # Business logic (match, prediction, sync, notifications)
  types/          # TypeScript types
  utils/          # Helpers (logger, retry, prompt loader)
  locales/        # i18n translation files
  prompts/        # AI prompt templates
prisma/           # Database schema and migrations
```
