import { Bot } from 'grammy';
import { config } from '@/config';
import { FootballDataClient } from '@/api/football-data/footballApi';
import { MatchService } from '@/services/matchService';
import { CacheService } from '@/services/cacheService';

// Импорты handlers
import { registerStartHandler } from './handler/startHandler';
import { registerCallbackHandler } from './handler/callback.handler';

// Создаем экземпляр бота
export const bot = new Bot(config.telegram.botToken);

// Создаем сервисы
const footballApi = new FootballDataClient();
const cache = new CacheService();
const matchService = new MatchService(footballApi, cache);

// Регистрируем обработчики
registerStartHandler(bot);
registerCallbackHandler(bot, matchService);

// Обработка ошибок
bot.catch((err) => {
  console.error('❌ Bot error:', err);
});

// Логирование старта
console.log('🤖 Bot initialized');
