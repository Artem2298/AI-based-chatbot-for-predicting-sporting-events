import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createMatchComposer,
  showMatchesPage,
  userMatchesState,
} from '../../bot/handlers/matchHandler';
import { MatchService } from '@/services/matchService';
import { NotificationService } from '@/services/notificationService';
import { Match } from '@/types/match.types';
import { createMockCtx } from '../helpers/mockContext';

vi.mock('@/services/dbService', () => ({
  DbService: {
    getUserByTelegramId: vi.fn().mockResolvedValue({ id: 1 }),
  },
  db: {},
}));

describe('matchHandler', () => {
  let mockMatchService: { getMatchDetails: ReturnType<typeof vi.fn> };
  let mockNotificationService: {
    isSubscribed: ReturnType<typeof vi.fn>;
    subscribe: ReturnType<typeof vi.fn>;
    unsubscribe: ReturnType<typeof vi.fn>;
  };
  let composer: ReturnType<typeof createMatchComposer>;
  let ctx: ReturnType<typeof createMockCtx>;

  beforeEach(() => {
    vi.clearAllMocks();
    userMatchesState.clear();

    mockMatchService = {
      getMatchDetails: vi.fn(),
    };

    mockNotificationService = {
      isSubscribed: vi.fn().mockResolvedValue(false),
      subscribe: vi.fn().mockResolvedValue(undefined),
      unsubscribe: vi.fn().mockResolvedValue(undefined),
    };

    composer = createMatchComposer(
      mockMatchService as unknown as MatchService,
      mockNotificationService as unknown as NotificationService
    );

    ctx = createMockCtx();
  });

  async function runMiddleware(context: typeof ctx) {
    await composer.middleware()(context as never, () => Promise.resolve());
  }

  describe('match:index callback', () => {
    it('should show finished match details with score', async () => {
      (ctx.update as Record<string, unknown>).callback_query = {
        data: 'match:0',
        from: { id: 1 },
      };
      ctx.match = ['match:0', '0'];

      userMatchesState.set(1, {
        matches: [{ id: 123 }] as unknown as Match[],
        leagueCode: 'PL',
        currentPage: 0,
      });

      mockMatchService.getMatchDetails.mockResolvedValue({
        id: 123,
        homeTeam: 'Arsenal',
        awayTeam: 'Chelsea',
        date: new Date(),
        competition: 'Premier League',
        status: 'FINISHED',
        score: { home: 2, away: 1 },
      });

      await runMiddleware(ctx);

      expect(mockMatchService.getMatchDetails).toHaveBeenCalledWith(123);
      const message = (ctx.reply as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(message).toContain('🏟️ **Arsenal** vs **Chelsea**');
      expect(message).toContain('**2 - 1**');
      expect(message).toContain('FINISHED');
      expect(message).toContain('Premier League');
    });

    it('should show "not started" text when score is null', async () => {
      (ctx.update as Record<string, unknown>).callback_query = {
        data: 'match:0',
        from: { id: 1 },
      };
      ctx.match = ['match:0', '0'];

      userMatchesState.set(1, {
        matches: [{ id: 123 }] as unknown as Match[],
        leagueCode: 'PL',
        currentPage: 0,
      });

      mockMatchService.getMatchDetails.mockResolvedValue({
        id: 123,
        homeTeam: 'Arsenal',
        awayTeam: 'Chelsea',
        date: new Date(),
        competition: 'Premier League',
        status: 'SCHEDULED',
        score: { home: null, away: null },
      });

      await runMiddleware(ctx);

      const message = (ctx.reply as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(message).toContain('Match not started yet');
      expect(message).not.toContain('**null');
    });

    it('should reply with error message when getMatchDetails fails', async () => {
      (ctx.update as Record<string, unknown>).callback_query = {
        data: 'match:0',
        from: { id: 1 },
      };
      ctx.match = ['match:0', '0'];

      userMatchesState.set(1, {
        matches: [{ id: 123 }] as unknown as Match[],
        leagueCode: 'PL',
        currentPage: 0,
      });

      mockMatchService.getMatchDetails.mockRejectedValue(new Error('API error'));

      await runMiddleware(ctx);

      const message = (ctx.reply as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(message).toContain('Error loading details');
    });

    it('should show league selection when session is expired', async () => {
      (ctx.update as Record<string, unknown>).callback_query = {
        data: 'match:0',
        from: { id: 1 },
      };
      ctx.match = ['match:0', '0'];

      await runMiddleware(ctx);

      expect(ctx.answerCallbackQuery).toHaveBeenCalledWith({
        text: 'Error loading league.',
      });
      const message = (ctx.reply as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(message).toBe('Choose a league:');
    });
  });

  describe('sub:matchId callback', () => {
    it('should subscribe user and confirm with notification', async () => {
      (ctx.update as Record<string, unknown>).callback_query = {
        data: 'sub:123',
        from: { id: 1 },
      };
      ctx.match = ['sub:123', '123'];

      userMatchesState.set(1, {
        matches: [{ id: 123 }] as unknown as Match[],
        leagueCode: 'PL',
        currentPage: 0,
      });

      mockMatchService.getMatchDetails.mockResolvedValue({
        id: 123,
        homeTeam: 'Arsenal',
        awayTeam: 'Chelsea',
        date: new Date(),
        competition: 'Premier League',
        status: 'SCHEDULED',
        score: { home: null, away: null },
      });

      await runMiddleware(ctx);

      expect(mockNotificationService.subscribe).toHaveBeenCalledWith(1, 123);
      expect(ctx.answerCallbackQuery).toHaveBeenCalledWith(
        expect.objectContaining({ text: expect.any(String) })
      );
    });
  });

  describe('unsub:matchId callback', () => {
    it('should unsubscribe user and confirm with notification', async () => {
      (ctx.update as Record<string, unknown>).callback_query = {
        data: 'unsub:123',
        from: { id: 1 },
      };
      ctx.match = ['unsub:123', '123'];

      userMatchesState.set(1, {
        matches: [{ id: 123 }] as unknown as Match[],
        leagueCode: 'PL',
        currentPage: 0,
      });

      mockMatchService.getMatchDetails.mockResolvedValue({
        id: 123,
        homeTeam: 'Arsenal',
        awayTeam: 'Chelsea',
        date: new Date(),
        competition: 'Premier League',
        status: 'SCHEDULED',
        score: { home: null, away: null },
      });

      await runMiddleware(ctx);

      expect(mockNotificationService.unsubscribe).toHaveBeenCalledWith(1, 123);
      expect(ctx.answerCallbackQuery).toHaveBeenCalledWith(
        expect.objectContaining({ text: expect.any(String) })
      );
    });
  });

  describe('back:matches callback', () => {
    it('should show matches page for current page', async () => {
      (ctx.update as Record<string, unknown>).callback_query = {
        data: 'back:matches:PL',
        from: { id: 1 },
      };
      ctx.match = ['back:matches:PL', 'PL'];

      const matches = Array.from({ length: 7 }, (_, i) => ({
        id: i,
        homeTeam: `H${i}`,
        awayTeam: `A${i}`,
        date: new Date(),
        competition: 'L',
      })) as unknown as Match[];

      userMatchesState.set(1, { matches, leagueCode: 'PL', currentPage: 1 });

      await runMiddleware(ctx);

      const message = (ctx.reply as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(message).toContain('Upcoming matches');
      expect(message).toContain('(2/2)');
    });

    it('should show league selection when session is expired', async () => {
      (ctx.update as Record<string, unknown>).callback_query = {
        data: 'back:matches:PL',
        from: { id: 1 },
      };
      ctx.match = ['back:matches:PL', 'PL'];

      await runMiddleware(ctx);

      expect(ctx.answerCallbackQuery).toHaveBeenCalledWith({
        text: 'Error loading league.',
      });
      const message = (ctx.reply as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(message).toBe('Choose a league:');
    });
  });

  describe('showMatchesPage', () => {
    it('should format message with match list and show Next button on first page', async () => {
      const matches = Array.from({ length: 10 }, (_, i) => ({
        id: i,
        homeTeam: `H${i}`,
        awayTeam: `A${i}`,
        date: new Date(),
        competition: 'L',
      })) as unknown as Match[];

      userMatchesState.set(1, { matches, leagueCode: 'PL', currentPage: 0 });

      await showMatchesPage(ctx as never, 1, 0);

      const message = (ctx.editMessageText as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(message).toContain('Upcoming matches');
      expect(message).toContain('(1/2)');

      const keyboard = (ctx.editMessageText as ReturnType<typeof vi.fn>).mock
        .calls[0][1].reply_markup;
      const flatKeyboard = keyboard.inline_keyboard.flat();
      expect(flatKeyboard.some((btn: { text: string }) => btn.text.includes('Next'))).toBe(true);
      expect(flatKeyboard.some((btn: { text: string }) => btn.text.includes('Back'))).toBe(false);
    });

    it('should show Back button and no Next button on last page', async () => {
      const matches = Array.from({ length: 10 }, (_, i) => ({
        id: i,
        homeTeam: `H${i}`,
        awayTeam: `A${i}`,
        date: new Date(),
        competition: 'L',
      })) as unknown as Match[];

      userMatchesState.set(1, { matches, leagueCode: 'PL', currentPage: 1 });

      await showMatchesPage(ctx as never, 1, 1);

      const keyboard = (ctx.editMessageText as ReturnType<typeof vi.fn>).mock
        .calls[0][1].reply_markup;
      const flatKeyboard = keyboard.inline_keyboard.flat();
      expect(flatKeyboard.some((btn: { text: string }) => btn.text.includes('Back'))).toBe(true);
      expect(flatKeyboard.some((btn: { text: string }) => btn.text.includes('Next'))).toBe(false);
    });

    it('should use ctx.reply instead of editMessageText when forceNew is true', async () => {
      const matches = Array.from({ length: 3 }, (_, i) => ({
        id: i,
        homeTeam: `H${i}`,
        awayTeam: `A${i}`,
        date: new Date(),
        competition: 'L',
      })) as unknown as Match[];

      userMatchesState.set(1, { matches, leagueCode: 'PL', currentPage: 0 });

      await showMatchesPage(ctx as never, 1, 0, true);

      expect(ctx.reply).toHaveBeenCalled();
      expect(ctx.editMessageText).not.toHaveBeenCalled();
      const message = (ctx.reply as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(message).toContain('Upcoming matches');
    });
  });
});
