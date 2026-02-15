import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createLeagueComposer } from '../../bot/handlers/leagueHandler';
import { userMatchesState } from '../../bot/handlers/matchHandler';
import { MatchService } from '@/services/matchService';
import { createMockCtx } from '../helpers/mockContext';

// Mock showMatchesPage
vi.mock('../../bot/handlers/matchHandler', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    showMatchesPage: vi.fn().mockResolvedValue(true),
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

  it('should handle league selection correctly', async () => {
    (ctx.update as Record<string, unknown>).callback_query = {
      data: 'league:PL',
      from: { id: 1 },
    };
    ctx.match = ['league:PL', 'PL'];

    const mockMatches = [{ id: 1, homeTeam: 'A', awayTeam: 'B' }];
    mockMatchService.getUpcomingMatches.mockResolvedValue(mockMatches);

    await runMiddleware(ctx);

    expect(ctx.answerCallbackQuery).toHaveBeenCalledWith({
      text: 'Loading matches...',
    });
    expect(mockMatchService.getUpcomingMatches).toHaveBeenCalledWith('PL', 14);
    expect(userMatchesState.get(1)).toMatchObject({
      matches: mockMatches,
      leagueCode: 'PL',
    });
  });

  it('should handle empty matches list', async () => {
    (ctx.update as Record<string, unknown>).callback_query = {
      data: 'league:PL',
      from: { id: 1 },
    };
    ctx.match = ['league:PL', 'PL'];

    mockMatchService.getUpcomingMatches.mockResolvedValue([]);

    await runMiddleware(ctx);

    expect(ctx.reply).toHaveBeenCalledWith('No upcoming matches found');
  });

  it('should handle main menu return', async () => {
    (ctx.update as Record<string, unknown>).callback_query = {
      data: 'back:main',
      from: { id: 1 },
    };

    await runMiddleware(ctx);

    expect(ctx.answerCallbackQuery).toHaveBeenCalled();
    expect(ctx.reply).toHaveBeenCalledWith(
      'Choose a league:',
      expect.any(Object)
    );
  });
});
