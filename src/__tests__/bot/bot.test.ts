import { describe, it, expect, vi, beforeAll } from 'vitest';
import { FootballDataClient } from '@/api/football-data/footballApi';
import { CacheService } from '@/services/cacheService';
import { MatchService } from '@/services/matchService';
import { PredictionService } from '@/services/prediction';
import { AccuracyService } from '@/services/accuracyService';
import { SyncService } from '@/services/syncService';
import { NotificationService } from '@/services/notificationService';
import { geminiClient } from '@/api/ai/geminiClient';
import { registerStartHandler } from '@/bot/handlers/startHandler';
import {
  createLeagueComposer,
  createMatchComposer,
  createPaginationComposer,
  createStatsComposer,
  createPredictionComposer,
  createStandingsComposer,
  createTimezoneComposer,
} from '@/bot/handlers';

vi.mock('grammy', () => ({
  Bot: vi.fn().mockImplementation(() => ({
    use: vi.fn(),
    command: vi.fn(),
    catch: vi.fn(),
    api: { setMyCommands: vi.fn() },
  })),
  Composer: vi.fn().mockImplementation(() => ({
    use: vi.fn(),
    callbackQuery: vi.fn(),
  })),
  InlineKeyboard: vi.fn().mockImplementation(() => ({
    text: vi.fn().mockReturnThis(),
    row: vi.fn().mockReturnThis(),
  })),
}));

vi.mock('@grammyjs/i18n', () => ({
  I18n: vi.fn().mockImplementation(() => ({})),
}));

vi.mock('@/config', () => ({
  config: {
    telegram: { botToken: 'test-token' },
    gemini: { apiKey: 'key', model: 'model' },
    footballApi: { baseUrl: 'http://test', apiKey: 'key' },
  },
}));

vi.mock('@/api/football-data/footballApi', () => ({
  FootballDataClient: vi.fn().mockImplementation(() => ({})),
}));
vi.mock('@/services/cacheService', () => ({
  CacheService: vi.fn().mockImplementation(() => ({})),
}));
vi.mock('@/services/matchService', () => ({
  MatchService: vi.fn().mockImplementation(() => ({})),
}));
vi.mock('@/services/prediction', () => ({
  PredictionService: vi.fn().mockImplementation(() => ({})),
}));
vi.mock('@/services/accuracyService', () => ({
  AccuracyService: vi.fn().mockImplementation(() => ({})),
}));
vi.mock('@/services/syncService', () => ({
  SyncService: vi.fn().mockImplementation(() => ({})),
}));
vi.mock('@/services/notificationService', () => ({
  NotificationService: vi.fn().mockImplementation(() => ({})),
}));
vi.mock('@/api/ai/geminiClient', () => ({ geminiClient: {} }));
vi.mock('@/bot/utils/formatters', () => ({
  setFormatterLocale: vi.fn(),
  setFormatterTimezone: vi.fn(),
}));
vi.mock('@/bot/handlers/startHandler', () => ({
  registerStartHandler: vi.fn(),
}));
vi.mock('@/bot/handlers', () => ({
  createLeagueComposer: vi.fn(),
  createMatchComposer: vi.fn(),
  createPaginationComposer: vi.fn(),
  createStatsComposer: vi.fn(),
  createPredictionComposer: vi.fn(),
  createStandingsComposer: vi.fn(),
  createTimezoneComposer: vi.fn(),
}));

describe('bot.ts initialization', () => {
  let bot: Awaited<typeof import('@/bot/bot')>['bot'];

  beforeAll(async () => {
    const module = await import('@/bot/bot');
    bot = module.bot;
  });

  describe('service dependency wiring', () => {
    it('should create MatchService with FootballDataClient and CacheService', () => {
      const footballApi = vi.mocked(FootballDataClient).mock.instances[0];
      const cache = vi.mocked(CacheService).mock.instances[0];
      expect(MatchService).toHaveBeenCalledWith(footballApi, cache);
    });

    it('should create PredictionService with MatchService and geminiClient', () => {
      const matchSvc = vi.mocked(MatchService).mock.instances[0];
      expect(PredictionService).toHaveBeenCalledWith(matchSvc, geminiClient);
    });

    it('should create SyncService with MatchService, AccuracyService and NotificationService', () => {
      const matchSvc = vi.mocked(MatchService).mock.instances[0];
      const accuracySvc = vi.mocked(AccuracyService).mock.instances[0];
      const notificationSvc = vi.mocked(NotificationService).mock.instances[0];
      expect(SyncService).toHaveBeenCalledWith(matchSvc, accuracySvc, notificationSvc);
    });
  });

  describe('handler wiring', () => {
    it('should pass bot to registerStartHandler', () => {
      expect(registerStartHandler).toHaveBeenCalledWith(bot);
    });

    it('should pass matchService to createLeagueComposer', () => {
      const matchSvc = vi.mocked(MatchService).mock.instances[0];
      expect(createLeagueComposer).toHaveBeenCalledWith(matchSvc);
    });

    it('should pass matchService and notificationService to createMatchComposer', () => {
      const matchSvc = vi.mocked(MatchService).mock.instances[0];
      const notificationSvc = vi.mocked(NotificationService).mock.instances[0];
      expect(createMatchComposer).toHaveBeenCalledWith(matchSvc, notificationSvc);
    });

    it('should pass matchService to createStatsComposer', () => {
      const matchSvc = vi.mocked(MatchService).mock.instances[0];
      expect(createStatsComposer).toHaveBeenCalledWith(matchSvc);
    });

    it('should pass matchService and predictionService to createPredictionComposer', () => {
      const matchSvc = vi.mocked(MatchService).mock.instances[0];
      const predictionSvc = vi.mocked(PredictionService).mock.instances[0];
      expect(createPredictionComposer).toHaveBeenCalledWith(matchSvc, predictionSvc);
    });

    it('should pass matchService to createStandingsComposer', () => {
      const matchSvc = vi.mocked(MatchService).mock.instances[0];
      expect(createStandingsComposer).toHaveBeenCalledWith(matchSvc);
    });

    it('should register createPaginationComposer and createTimezoneComposer', () => {
      expect(createPaginationComposer).toHaveBeenCalled();
      expect(createTimezoneComposer).toHaveBeenCalled();
    });

    it('should register an error handler on the bot', () => {
      expect(bot.catch).toHaveBeenCalled();
    });
  });
});
