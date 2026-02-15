import { describe, it, expect, vi } from 'vitest';

// Mock grammy
vi.mock('grammy', () => ({
  Bot: vi.fn().mockImplementation(() => ({
    use: vi.fn(),
    command: vi.fn(),
    catch: vi.fn(),
  })),
  Composer: vi.fn().mockImplementation(() => ({
    use: vi.fn(),
    callbackQuery: vi.fn(),
  })),
  InlineKeyboard: vi.fn().mockImplementation(() => {
    const mock = {
      text: vi.fn().mockReturnThis(),
      row: vi.fn().mockReturnThis(),
    };
    return mock;
  }),
}));

// Mock i18n
vi.mock('@grammyjs/i18n', () => ({
  I18n: vi.fn().mockImplementation(() => ({})),
}));

// Mock config
vi.mock('@/config', () => ({
  config: {
    telegram: { botToken: 'test-token' },
    gemini: { apiKey: 'key', model: 'model' },
    footballData: { apiKey: 'key' },
  },
}));

// Mock all services and handlers to avoid side effects
vi.mock('@/api/football-data/footballApi', () => ({
  FootballDataClient: vi.fn(),
}));
vi.mock('@/services/cacheService', () => ({ CacheService: vi.fn() }));
vi.mock('@/services/matchService', () => ({ MatchService: vi.fn() }));
vi.mock('@/services/predictionService', () => ({ PredictionService: vi.fn() }));
vi.mock('@/services/accuracyService', () => ({ AccuracyService: vi.fn() }));
vi.mock('@/services/syncService', () => ({ SyncService: vi.fn() }));
vi.mock('@/api/ai/geminiClient', () => ({ geminiClient: {} }));
vi.mock('@/bot/utils/formatters', () => ({
  setFormatterLocale: vi.fn(),
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
}));

describe('bot.ts initialization', () => {
  it('should initialize bot and register handlers', async () => {
    // Importing bot.ts will trigger initialization
    const { bot } = await import('@/bot/bot');
    const { registerStartHandler } = await import(
      '@/bot/handlers/startHandler'
    );
    const {
      createLeagueComposer,
      createMatchComposer,
      createPaginationComposer,
      createStatsComposer,
      createPredictionComposer,
      createStandingsComposer,
    } = await import('@/bot/handlers');

    expect(bot).toBeDefined();
    expect(registerStartHandler).toHaveBeenCalledWith(bot);

    // bot.use is called 8 times: i18n + locale middleware + 6 handler composers
    expect(bot.use).toHaveBeenCalledTimes(8);
    expect(createLeagueComposer).toHaveBeenCalled();
    expect(createMatchComposer).toHaveBeenCalled();
    expect(createPaginationComposer).toHaveBeenCalled();
    expect(createStatsComposer).toHaveBeenCalled();
    expect(createPredictionComposer).toHaveBeenCalled();
    expect(createStandingsComposer).toHaveBeenCalled();

    expect(bot.catch).toHaveBeenCalled();
  });
});
