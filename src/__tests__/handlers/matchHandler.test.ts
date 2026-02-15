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
  let mockNotificationService: { isSubscribed: ReturnType<typeof vi.fn> };
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

  describe('callbackQuery Handler', () => {
    it('should show match details on match:index', async () => {
      (ctx.update as Record<string, unknown>).callback_query = {
        data: 'match:0',
        from: { id: 1 },
      };
      ctx.match = ['match:0', '0'];

      const mockMatch = { id: 123, homeTeam: 'A', awayTeam: 'B' };
      userMatchesState.set(1, {
        matches: [mockMatch] as unknown as Match[],
        leagueCode: 'PL',
        currentPage: 0,
      });

      mockMatchService.getMatchDetails.mockResolvedValue({
        ...mockMatch,
        date: new Date(),
        competition: 'League',
        status: 'FINISHED',
        score: { home: 1, away: 0 },
      });

      await runMiddleware(ctx);

      expect(ctx.answerCallbackQuery).toHaveBeenCalledWith({
        text: 'Loading details...',
      });
      expect(mockMatchService.getMatchDetails).toHaveBeenCalledWith(123);
      expect(ctx.editMessageText).toHaveBeenCalled();
      const message = (ctx.editMessageText as ReturnType<typeof vi.fn>).mock
        .calls[0][0];
      expect(message).toContain('🏟️ **A** vs **B**');
      expect(message).toContain('Score');
      expect(message).toContain('**1 - 0**');
    });

    it('should handle back:matches:leagueCode', async () => {
      (ctx.update as Record<string, unknown>).callback_query = {
        data: 'back:matches:PL',
        from: { id: 1 },
      };
      ctx.match = ['back:matches:PL', 'PL'];

      userMatchesState.set(1, {
        matches: [],
        leagueCode: 'PL',
        currentPage: 0,
      });

      await runMiddleware(ctx);

      expect(ctx.answerCallbackQuery).toHaveBeenCalled();
    });

    it('should handle expired session', async () => {
      (ctx.update as Record<string, unknown>).callback_query = {
        data: 'match:0',
        from: { id: 1 },
      };
      ctx.match = ['match:0', '0'];

      // No state set for user 1

      await runMiddleware(ctx);

      expect(ctx.answerCallbackQuery).toHaveBeenCalledWith({
        text: 'Error loading league.',
      });
      expect(ctx.reply).toHaveBeenCalledWith(
        'Choose a league:',
        expect.any(Object)
      );
    });
  });

  describe('showMatchesPage', () => {
    it('should format message with matches list and navigation buttons', async () => {
      const matches = Array.from({ length: 10 }, (_, i) => ({
        id: i,
        homeTeam: `H${i}`,
        awayTeam: `A${i}`,
        date: new Date(),
        competition: 'L',
      })) as unknown as Match[];

      userMatchesState.set(1, {
        matches,
        leagueCode: 'PL',
        currentPage: 0,
      });

      await showMatchesPage(ctx as never, 1, 0);

      expect(ctx.editMessageText).toHaveBeenCalled();
      const message = (ctx.editMessageText as ReturnType<typeof vi.fn>).mock
        .calls[0][0];
      expect(message).toContain('Upcoming matches');
      expect(message).toContain('(1/2)');

      const keyboard = (ctx.editMessageText as ReturnType<typeof vi.fn>).mock
        .calls[0][1].reply_markup;
      const flatKeyboard = keyboard.inline_keyboard.flat();
      // Next button should exist, Back button should not (first page)
      expect(
        flatKeyboard.some((btn: { text: string }) =>
          btn.text.includes('Next')
        )
      ).toBe(true);
    });

    it('should show previous buttons on later pages', async () => {
      const matches = Array.from({ length: 10 }, (_, i) => ({
        id: i,
        homeTeam: `H${i}`,
        awayTeam: `A${i}`,
        date: new Date(),
        competition: 'L',
      })) as unknown as Match[];

      userMatchesState.set(1, {
        matches,
        leagueCode: 'PL',
        currentPage: 1,
      });

      await showMatchesPage(ctx as never, 1, 1);

      const keyboard = (ctx.editMessageText as ReturnType<typeof vi.fn>).mock
        .calls[0][1].reply_markup;
      const flatKeyboard = keyboard.inline_keyboard.flat();
      expect(
        flatKeyboard.some((btn: { text: string }) =>
          btn.text.includes('Back')
        )
      ).toBe(true);
    });
  });
});
