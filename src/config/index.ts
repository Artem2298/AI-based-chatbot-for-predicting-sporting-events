import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  FOOTBALL_API_KEY: z.string().min(1, 'FOOTBALL_API_KEY is required'),
  FOOTBALL_API_BASE_URL: z
    .string()
    .url()
    .default('https://api.football-data.org/v4'),
  TELEGRAM_BOT_TOKEN: z.string().min(1, 'TELEGRAM_BOT_TOKEN is required'),
});

const parseEnv = () => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Invalid environment variables:');
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      process.exit(1);
    }
    throw error;
  }
};

const env = parseEnv();

export const config = {
  footballApi: {
    apiKey: env.FOOTBALL_API_KEY,
    baseUrl: env.FOOTBALL_API_BASE_URL,
  },
  telegram: {
    botToken: env.TELEGRAM_BOT_TOKEN,
  },
  env: 'development' as const,
} as const;
