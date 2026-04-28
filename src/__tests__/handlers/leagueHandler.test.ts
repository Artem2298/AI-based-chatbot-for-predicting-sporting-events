import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createLeagueComposer } from '../../bot/handlers/leagueHandler';
import { userMatchesState, showMatchesPage } from '../../bot/handlers/matchHandler';
import { MatchService } from '@/services/matchService';
import { createMockCtx } from '../helpers/mockContext';

vi.mock('../../bot/handlers/matchHandler', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    showMatchesPage: vi.fn().mockResolvedValue(undefined),
  };
});

describe('leagueHandler', () => {
  let mockMatchService: { getUpcomingMatches: ReturnType<typeof vi.fn> };
  let composer: ReturnType<typeof createLeagueComposer>;
  let ctx: ReturnType<typeof createMockCtx>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockMatchService = {
      getUpcomingMatches: vi.fn(),
    };

    composer = createLeagueComposer(
      mockMatchService as unknown as MatchService
    );

    ctx = createMockCtx();
  });

  async function runMiddleware(context: typeof ctx) {
    await composer.middleware()(context as never, () => Promise.resolve());
  }

  describe('leagues callback', () => {
    it('should reply with league selection menu', async () => {
      (ctx.update as Record<string, unknown>).callback_query = {
        data: 'leagues',
        from: { id: 1 },
      };

      await runMiddleware(ctx);

      expect(ctx.answerCallbackQuery).toHaveBeenCalled();
      expect(ctx.reply).toHaveBeenCalled();
      const message = (ctx.reply as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(message).toBe('Choose a league:');
    });
  });

  describe('league:code callback', () => {
    it('should fetch matches, save state and show matches page', async () => {
      (ctx.update as Record<string, unknown>).callback_query = {
        data: 'league:PL',
        from: { id: 1 },
      };
      ctx.match = ['league:PL', 'PL'];

      const mockMatches = [{ id: 1, homeTeam: 'Arsenal', awayTeam: 'Chelsea' }];
      mockMatchService.getUpcomingMatches.mockResolvedValue(mockMatches);

      await runMiddleware(ctx);

      expect(mockMatchService.getUpcomingMatches).toHaveBeenCalledWith('PL', 30);
      expect(userMatchesState.get(1)).toEqual({
        matches: mockMatches,
        leagueCode: 'PL',
        currentPage: 0,
      });
      expect(showMatchesPage).toHaveBeenCalledWith(ctx, 1, 0, true);
    });

    it('should reply with "no matches" message when list is empty', async () => {
      (ctx.update as Record<string, unknown>).callback_query = {
        data: 'league:PL',
        from: { id: 1 },
      };
      ctx.match = ['league:PL', 'PL'];

      mockMatchService.getUpcomingMatches.mockResolvedValue([]);

      await runMiddleware(ctx);

      expect(ctx.reply).toHaveBeenCalledWith('No upcoming matches found');
      expect(showMatchesPage).not.toHaveBeenCalled();
    });

    it('should reply with error message when fetch fails', async () => {
      (ctx.update as Record<string, unknown>).callback_query = {
        data: 'league:BL1',
        from: { id: 1 },
      };
      ctx.match = ['league:BL1', 'BL1'];

      mockMatchService.getUpcomingMatches.mockRejectedValue(new Error('API error'));

      await runMiddleware(ctx);

      expect(ctx.reply).toHaveBeenCalled();
      const message = (ctx.reply as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(message).toBe('Error loading matches');
    });
  });

  describe('back:main callback', () => {
    it('should reply with welcome message containing user name', async () => {
      (ctx.update as Record<string, unknown>).callback_query = {
        data: 'back:main',
        from: { id: 1, first_name: 'Artem' },
      };

      await runMiddleware(ctx);

      expect(ctx.answerCallbackQuery).toHaveBeenCalled();
      const message = (ctx.reply as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(message).toBe('Hello, Artem! I am a bot AI for football predictions');
    });

    it('should reply with empty name when first_name is missing', async () => {
      (ctx.update as Record<string, unknown>).callback_query = {
        data: 'back:main',
        from: { id: 1 },
      };

      await runMiddleware(ctx);

      const message = (ctx.reply as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(message).toBe('Hello, ! I am a bot AI for football predictions');
    });
  });
});
