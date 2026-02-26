import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotificationService } from '../../services/notificationService';
import { Api } from 'grammy';
import { db } from '@/services/dbService';
import { i18n } from '@/bot/bot';

vi.mock('@/utils/retry', () => ({
  withDbRetry: vi.fn((fn: () => unknown) => fn()),
}));

vi.mock('@/services/dbService', () => ({
  db: {
    matchSubscription: {
      upsert: vi.fn(),
      deleteMany: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    userPrediction: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@/utils/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

vi.mock('@/bot/bot', () => ({
  i18n: {
    t: vi.fn((locale: string, key: string) => {
      const translations: Record<string, Record<string, string>> = {
        en: {
          'notify-pre-match-title': 'Match starts in 15 minutes!',
          'notify-post-match-title': 'Match finished!',
          'notify-no-predictions': 'You have no predictions for this match',
          'notify-your-predictions': 'Your predictions:',
          'notify-type-outcome': 'Outcome',
          'notify-type-corners': 'Corners',
        },
        ru: {
          'notify-pre-match-title': 'Матч начнется через 15 минут!',
          'notify-post-match-title': 'Матч завершен!',
        },
        uk: {
          'notify-pre-match-title': 'Матч почнеться через 15 хвилин!',
        }
      };
      return translations[locale]?.[key] || key;
    }),
  },
}));

const mockDb = db as unknown as {
  matchSubscription: {
    upsert: ReturnType<typeof vi.fn>;
    deleteMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  userPrediction: {
    findMany: ReturnType<typeof vi.fn>;
  };
};

describe('NotificationService', () => {
  let service: NotificationService;
  let mockApi: { sendMessage: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
    mockApi = { sendMessage: vi.fn().mockResolvedValue(true) };
    service = new NotificationService(mockApi as unknown as Api);
  });

  // ─── subscribe ───────────────────────────────────────────────────────────────

  describe('subscribe', () => {
    it('should call upsert with correct composite key and data', async () => {
      mockDb.matchSubscription.upsert.mockResolvedValue({});

      await service.subscribe(1, 42);

      expect(mockDb.matchSubscription.upsert).toHaveBeenCalledWith({
        where: { userId_matchId: { userId: 1, matchId: 42 } },
        update: {},
        create: { userId: 1, matchId: 42 },
      });
    });
  });

  // ─── unsubscribe ─────────────────────────────────────────────────────────────

  describe('unsubscribe', () => {
    it('should call deleteMany with correct userId and matchId', async () => {
      mockDb.matchSubscription.deleteMany.mockResolvedValue({ count: 1 });

      await service.unsubscribe(1, 42);

      expect(mockDb.matchSubscription.deleteMany).toHaveBeenCalledWith({
        where: { userId: 1, matchId: 42 },
      });
    });
  });

  // ─── isSubscribed ─────────────────────────────────────────────────────────────

  describe('isSubscribed', () => {
    it('should return true when subscription exists', async () => {
      mockDb.matchSubscription.findUnique.mockResolvedValue({ id: 1 });

      const result = await service.isSubscribed(1, 42);

      expect(result).toBe(true);
    });

    it('should return false when subscription does not exist', async () => {
      mockDb.matchSubscription.findUnique.mockResolvedValue(null);

      const result = await service.isSubscribed(1, 42);

      expect(result).toBe(false);
    });
  });

  // ─── sendPreMatchReminders ────────────────────────────────────────────────────

  describe('sendPreMatchReminders', () => {
    it('should not send any messages when there are no subscribers', async () => {
      mockDb.matchSubscription.findMany.mockResolvedValue([]);

      await service.sendPreMatchReminders(1, 'Arsenal', 'Chelsea', 'Premier League');

      expect(mockApi.sendMessage).not.toHaveBeenCalled();
    });

    it('should send a message to each subscriber', async () => {
      mockDb.matchSubscription.findMany.mockResolvedValue([
        { id: 10, user: { telegramId: BigInt(100), locale: 'en' } },
        { id: 11, user: { telegramId: BigInt(200), locale: 'en' } },
      ]);
      mockDb.matchSubscription.update.mockResolvedValue({});

      await service.sendPreMatchReminders(1, 'Arsenal', 'Chelsea', 'Premier League');

      expect(mockApi.sendMessage).toHaveBeenCalledTimes(2);
    });

    it('should send with parse_mode Markdown', async () => {
      mockDb.matchSubscription.findMany.mockResolvedValue([
        { id: 10, user: { telegramId: BigInt(100), locale: 'en' } },
      ]);
      mockDb.matchSubscription.update.mockResolvedValue({});

      await service.sendPreMatchReminders(1, 'Arsenal', 'Chelsea', 'Premier League');

      expect(mockApi.sendMessage).toHaveBeenCalledWith(
        100,
        expect.any(String),
        { parse_mode: 'Markdown' }
      );
    });

    it('should mark subscription as notifiedPre after sending', async () => {
      mockDb.matchSubscription.findMany.mockResolvedValue([
        { id: 10, user: { telegramId: BigInt(100), locale: 'en' } },
      ]);
      mockDb.matchSubscription.update.mockResolvedValue({});

      await service.sendPreMatchReminders(1, 'Arsenal', 'Chelsea', 'Premier League');

      expect(mockDb.matchSubscription.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: { notifiedPre: true },
      });
    });

    it('should use Russian message for locale "ru"', async () => {
      mockDb.matchSubscription.findMany.mockResolvedValue([
        { id: 10, user: { telegramId: BigInt(100), locale: 'ru' } },
      ]);
      mockDb.matchSubscription.update.mockResolvedValue({});

      await service.sendPreMatchReminders(1, 'Arsenal', 'Chelsea', 'Premier League');

      expect(i18n.t).toHaveBeenCalledWith('ru', 'notify-pre-match-title');
      const message: string = mockApi.sendMessage.mock.calls[0][1];
      expect(message).toContain('Матч начнется через 15 минут!');
    });

    it('should use Ukrainian message for locale "uk"', async () => {
      mockDb.matchSubscription.findMany.mockResolvedValue([
        { id: 10, user: { telegramId: BigInt(100), locale: 'uk' } },
      ]);
      mockDb.matchSubscription.update.mockResolvedValue({});

      await service.sendPreMatchReminders(1, 'Arsenal', 'Chelsea', 'Premier League');

      expect(i18n.t).toHaveBeenCalledWith('uk', 'notify-pre-match-title');
      const message: string = mockApi.sendMessage.mock.calls[0][1];
      expect(message).toContain('Матч почнеться через 15 хвилин!');
    });

    it('should use English message for locale "en"', async () => {
      mockDb.matchSubscription.findMany.mockResolvedValue([
        { id: 10, user: { telegramId: BigInt(100), locale: 'en' } },
      ]);
      mockDb.matchSubscription.update.mockResolvedValue({});

      await service.sendPreMatchReminders(1, 'Arsenal', 'Chelsea', 'Premier League');

      expect(i18n.t).toHaveBeenCalledWith('en', 'notify-pre-match-title');
      const message: string = mockApi.sendMessage.mock.calls[0][1];
      expect(message).toContain('Match starts in 15 minutes!');
    });

    it('should continue sending to remaining subscribers even if one fails', async () => {
      mockDb.matchSubscription.findMany.mockResolvedValue([
        { id: 10, user: { telegramId: BigInt(100), locale: 'en' } },
        { id: 11, user: { telegramId: BigInt(200), locale: 'en' } },
      ]);
      mockDb.matchSubscription.update.mockResolvedValue({});
      mockApi.sendMessage
        .mockRejectedValueOnce(new Error('Telegram error'))
        .mockResolvedValueOnce(true);

      await expect(
        service.sendPreMatchReminders(1, 'Arsenal', 'Chelsea', 'Premier League')
      ).resolves.not.toThrow();

      expect(mockApi.sendMessage).toHaveBeenCalledTimes(2);
    });
  });

  // ─── sendPostMatchResults ─────────────────────────────────────────────────────

  describe('sendPostMatchResults', () => {
    it('should not send any messages when there are no subscribers', async () => {
      mockDb.matchSubscription.findMany.mockResolvedValue([]);

      await service.sendPostMatchResults(1, 'Arsenal', 'Chelsea', 2, 1);

      expect(mockApi.sendMessage).not.toHaveBeenCalled();
    });

    it('should fetch userPredictions for each subscriber', async () => {
      mockDb.matchSubscription.findMany.mockResolvedValue([
        { id: 10, user: { id: 5, telegramId: BigInt(100), locale: 'en' } },
      ]);
      mockDb.userPrediction.findMany.mockResolvedValue([]);
      mockDb.matchSubscription.update.mockResolvedValue({});

      await service.sendPostMatchResults(1, 'Arsenal', 'Chelsea', 2, 1);

      expect(mockDb.userPrediction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 5 }),
        })
      );
    });

    it('should mark subscription as notifiedPost after sending', async () => {
      mockDb.matchSubscription.findMany.mockResolvedValue([
        { id: 10, user: { id: 5, telegramId: BigInt(100), locale: 'en' } },
      ]);
      mockDb.userPrediction.findMany.mockResolvedValue([]);
      mockDb.matchSubscription.update.mockResolvedValue({});

      await service.sendPostMatchResults(1, 'Arsenal', 'Chelsea', 2, 1);

      expect(mockDb.matchSubscription.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: { notifiedPost: true },
      });
    });

    it('should show "no predictions" message when user has no predictions', async () => {
      mockDb.matchSubscription.findMany.mockResolvedValue([
        { id: 10, user: { id: 5, telegramId: BigInt(100), locale: 'en' } },
      ]);
      mockDb.userPrediction.findMany.mockResolvedValue([]);
      mockDb.matchSubscription.update.mockResolvedValue({});

      await service.sendPostMatchResults(1, 'Arsenal', 'Chelsea', 2, 1);

      const message: string = mockApi.sendMessage.mock.calls[0][1];
      expect(message).toContain('You have no predictions for this match');
    });

    it('should show ✅ for a correct outcome prediction', async () => {
      mockDb.matchSubscription.findMany.mockResolvedValue([
        { id: 10, user: { id: 5, telegramId: BigInt(100), locale: 'en' } },
      ]);
      mockDb.userPrediction.findMany.mockResolvedValue([
        {
          prediction: {
            type: 'outcome',
            accuracy: { outcomeCorrect: true, goalsOverUnderCorrect: null, bttsCorrect: null },
          },
        },
      ]);
      mockDb.matchSubscription.update.mockResolvedValue({});

      await service.sendPostMatchResults(1, 'Arsenal', 'Chelsea', 2, 1);

      const message: string = mockApi.sendMessage.mock.calls[0][1];
      expect(message).toContain('✅');
    });

    it('should show ❌ for an incorrect outcome prediction', async () => {
      mockDb.matchSubscription.findMany.mockResolvedValue([
        { id: 10, user: { id: 5, telegramId: BigInt(100), locale: 'en' } },
      ]);
      mockDb.userPrediction.findMany.mockResolvedValue([
        {
          prediction: {
            type: 'outcome',
            accuracy: { outcomeCorrect: false, goalsOverUnderCorrect: null, bttsCorrect: null },
          },
        },
      ]);
      mockDb.matchSubscription.update.mockResolvedValue({});

      await service.sendPostMatchResults(1, 'Arsenal', 'Chelsea', 2, 1);

      const message: string = mockApi.sendMessage.mock.calls[0][1];
      expect(message).toContain('❌');
    });

    it('should show ⏳ when accuracy has not been calculated yet', async () => {
      mockDb.matchSubscription.findMany.mockResolvedValue([
        { id: 10, user: { id: 5, telegramId: BigInt(100), locale: 'en' } },
      ]);
      mockDb.userPrediction.findMany.mockResolvedValue([
        { prediction: { type: 'outcome', accuracy: null } },
      ]);
      mockDb.matchSubscription.update.mockResolvedValue({});

      await service.sendPostMatchResults(1, 'Arsenal', 'Chelsea', 2, 1);

      const message: string = mockApi.sendMessage.mock.calls[0][1];
      expect(message).toContain('⏳');
    });

    it('should show — for a prediction type with no accuracy mapping (e.g. corners)', async () => {
      mockDb.matchSubscription.findMany.mockResolvedValue([
        { id: 10, user: { id: 5, telegramId: BigInt(100), locale: 'en' } },
      ]);
      mockDb.userPrediction.findMany.mockResolvedValue([
        {
          prediction: {
            type: 'corners',
            accuracy: { outcomeCorrect: null, goalsOverUnderCorrect: null, bttsCorrect: null },
          },
        },
      ]);
      mockDb.matchSubscription.update.mockResolvedValue({});

      await service.sendPostMatchResults(1, 'Arsenal', 'Chelsea', 2, 1);

      const message: string = mockApi.sendMessage.mock.calls[0][1];
      expect(message).toContain('—');
    });

    it('should use Russian message for locale "ru"', async () => {
      mockDb.matchSubscription.findMany.mockResolvedValue([
        { id: 10, user: { id: 5, telegramId: BigInt(100), locale: 'ru' } },
      ]);
      mockDb.userPrediction.findMany.mockResolvedValue([]);
      mockDb.matchSubscription.update.mockResolvedValue({});

      await service.sendPostMatchResults(1, 'Arsenal', 'Chelsea', 2, 1);

      expect(i18n.t).toHaveBeenCalledWith('ru', 'notify-post-match-title');
      const message: string = mockApi.sendMessage.mock.calls[0][1];
      expect(message).toContain('Матч завершен!');
    });

    it('should continue sending to remaining subscribers even if one fails', async () => {
      mockDb.matchSubscription.findMany.mockResolvedValue([
        { id: 10, user: { id: 5, telegramId: BigInt(100), locale: 'en' } },
        { id: 11, user: { id: 6, telegramId: BigInt(200), locale: 'en' } },
      ]);
      mockDb.userPrediction.findMany.mockResolvedValue([]);
      mockDb.matchSubscription.update.mockResolvedValue({});
      mockApi.sendMessage
        .mockRejectedValueOnce(new Error('Telegram error'))
        .mockResolvedValueOnce(true);

      await expect(
        service.sendPostMatchResults(1, 'Arsenal', 'Chelsea', 2, 1)
      ).resolves.not.toThrow();

      expect(mockApi.sendMessage).toHaveBeenCalledTimes(2);
    });
  });
});
