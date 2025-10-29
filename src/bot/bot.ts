import { Bot } from 'grammy';
import { config } from '@/config';
import { registerStartHandler } from './handler/startHandler';
import { registerLeaguesHandler } from './handler/leaguesHandler';
import { FootballDataClient } from '@/api/football-data/footballApi';
import { MatchService } from '@/services/matchService';
import { CacheService } from '@/services/cacheService';

export const bot = new Bot(config.telegram.botToken);

const footballApi = new FootballDataClient();
const cache = new CacheService();
const matchService = new MatchService(footballApi, cache);

registerStartHandler(bot);
registerLeaguesHandler(bot, matchService);

bot.catch((err) => {
  console.error('❌ Bot error:', err);
});

console.log('🤖 Bot initialized');
