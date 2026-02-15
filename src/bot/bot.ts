import { Bot } from 'grammy';
import { config } from '@/config';
import { createLogger } from '@/utils/logger';
import { FootballDataClient } from '@/api/football-data/footballApi';
import { MatchService } from '@/services/matchService';
import { CacheService } from '@/services/cacheService';
import { PredictionService } from '@/services/predictionService';
import { SyncService } from '@/services/syncService';
import { AccuracyService } from '@/services/accuracyService';
import { NotificationService } from '@/services/notificationService';
import { geminiClient } from '@/api/ai/geminiClient';

import { registerStartHandler } from './handlers/startHandler';
import { setFormatterLocale } from './utils/formatters';

import { I18n } from '@grammyjs/i18n';
import { join } from 'path';
import { BotContext } from '@/types/context';

import {
  createLeagueComposer,
  createMatchComposer,
  createPaginationComposer,
  createStatsComposer,
  createPredictionComposer,
  createStandingsComposer,
} from './handlers';

export const bot = new Bot<BotContext>(config.telegram.botToken);

const i18n = new I18n<BotContext>({
  defaultLocale: 'ru',
  directory: join(process.cwd(), 'src', 'locales'),
});

bot.use(i18n);

bot.use(async (ctx, next) => {
  const lang = ctx.from?.language_code || 'en';
  setFormatterLocale(lang);
  await next();
});

const footballApi = new FootballDataClient();
const cache = new CacheService();
const matchService = new MatchService(footballApi, cache);
const predictionService = new PredictionService(matchService, geminiClient);
const accuracyService = new AccuracyService();
const notificationService = new NotificationService(bot.api);
export const syncService = new SyncService(matchService, accuracyService, notificationService);

registerStartHandler(bot);
bot.use(createLeagueComposer(matchService));
bot.use(createMatchComposer(matchService, notificationService));
bot.use(createPaginationComposer());
bot.use(createStatsComposer(matchService));
bot.use(createPredictionComposer(matchService, predictionService));
bot.use(createStandingsComposer(matchService));

const log = createLogger('bot');

bot.catch((err) => {
  log.error({ err }, 'bot error');
});

log.info('bot initialized with modular handlers');
