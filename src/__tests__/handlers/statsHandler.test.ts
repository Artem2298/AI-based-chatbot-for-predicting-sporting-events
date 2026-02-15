import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createStatsComposer } from '../../bot/handlers/statsHandler';
import { userMatchesState } from '../../bot/handlers/matchHandler';
import { MatchService } from '@/services/matchService';
import { Match } from '@/types/match.types';
import { createMockCtx } from '../helpers/mockContext';

// Mock dependencies
vi.mock('@/services/matchService');

describe('statsHandler', () => {
  let mockMatchService: {
    getMatchDetails: ReturnType<typeof vi.fn>;
    getTeamLastMatches: ReturnType<typeof vi.fn>;
    getHeadToHead: ReturnType<typeof vi.fn>;
  };
  let composer: ReturnType<typeof createStatsComposer>;
  let ctx: ReturnType<typeof createMockCtx>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockMatchService = {
      getMatchDetails: vi.fn(),
      getTeamLastMatches: vi.fn(),
      getHeadToHead: vi.fn(),
    };

    composer = createStatsComposer(
      mockMatchService as unknown as MatchService
    );

    ctx = createMockCtx();

    userMatchesState.set(1, {
      matches: [
        {
          id: 123,
          homeTeam: 'A',
          awayTeam: 'B',
          date: new Date(),
          competition: 'L',
        },
      ] as unknown as Match[],
      leagueCode: 'PL',
      currentPage: 0,
    });
  });

  async function runMiddleware(context: typeof ctx) {
    await composer.middleware()(context as never, () => Promise.resolve());
  }

  it('should handle basic stats callback correctly', async () => {
    (ctx.update as Record<string, unknown>).callback_query = {
      data: 'stats:basic:123',
      from: { id: 1 },
    };
    ctx.match = ['stats:basic:123', '123'];

    mockMatchService.getMatchDetails.mockResolvedValue({
      id: 123,
      homeTeam: 'Team A',
      awayTeam: 'Team B',
      homeTeamId: 1,
      awayTeamId: 2,
      competitionCode: 'PL',
    });
    mockMatchService.getTeamLastMatches.mockResolvedValue([]);

    await runMiddleware(ctx);

    expect(ctx.answerCallbackQuery).toHaveBeenCalledWith({
      text: 'Loading statistics...',
    });
    expect(mockMatchService.getMatchDetails).toHaveBeenCalledWith(123);
    expect(ctx.editMessageText).toHaveBeenCalled();
    const message = (ctx.editMessageText as ReturnType<typeof vi.fn>).mock
      .calls[0][0];
    expect(message).toContain('Match Statistics');
    expect(message).toContain('Last matches:');
  });

  it('should handle home stats callback correctly', async () => {
    (ctx.update as Record<string, unknown>).callback_query = {
      data: 'stats:home:123',
      from: { id: 1 },
    };
    ctx.match = ['stats:home:123', '123'];

    mockMatchService.getMatchDetails.mockResolvedValue({
      id: 123,
      homeTeam: 'Team A',
      awayTeam: 'Team B',
      homeTeamId: 1,
      awayTeamId: 2,
      competitionCode: 'PL',
    });
    mockMatchService.getTeamLastMatches.mockResolvedValue([]);

    await runMiddleware(ctx);

    expect(ctx.answerCallbackQuery).toHaveBeenCalledWith({
      text: 'Loading statistics...',
    });
    const message = (ctx.editMessageText as ReturnType<typeof vi.fn>).mock
      .calls[0][0];
    expect(message).toContain('Home Stats: Team A');
  });

  it('should handle away stats callback correctly', async () => {
    (ctx.update as Record<string, unknown>).callback_query = {
      data: 'stats:away:123',
      from: { id: 1 },
    };
    ctx.match = ['stats:away:123', '123'];

    mockMatchService.getMatchDetails.mockResolvedValue({
      id: 123,
      homeTeam: 'Team A',
      awayTeam: 'Team B',
      homeTeamId: 1,
      awayTeamId: 2,
      competitionCode: 'PL',
    });
    mockMatchService.getTeamLastMatches.mockResolvedValue([]);

    await runMiddleware(ctx);

    expect(ctx.answerCallbackQuery).toHaveBeenCalledWith({
      text: 'Loading statistics...',
    });
    const message = (ctx.editMessageText as ReturnType<typeof vi.fn>).mock
      .calls[0][0];
    expect(message).toContain('Away Stats: Team B');
  });

  it('should handle h2h stats with different results correctly', async () => {
    (ctx.update as Record<string, unknown>).callback_query = {
      data: 'stats:h2h:123',
      from: { id: 1 },
    };
    ctx.match = ['stats:h2h:123', '123'];

    mockMatchService.getMatchDetails.mockResolvedValue({
      id: 123,
      homeTeam: 'Team A',
      awayTeam: 'Team B',
    });
    mockMatchService.getHeadToHead.mockResolvedValue([
      {
        homeTeam: 'Team A',
        awayTeam: 'Team B',
        score: { home: 1, away: 2 },
        competition: 'L',
      },
      {
        homeTeam: 'Team B',
        awayTeam: 'Team A',
        score: { home: 1, away: 2 },
        competition: 'L',
      },
      {
        homeTeam: 'Team A',
        awayTeam: 'Team B',
        score: { home: 1, away: 1 },
        competition: 'L',
      },
    ]);

    await runMiddleware(ctx);

    const message = (ctx.editMessageText as ReturnType<typeof vi.fn>).mock
      .calls[0][0];
    expect(message).toContain('❌ Team A 1-2 Team B');
    expect(message).toContain('✅ Team B 1-2 Team A');
    expect(message).toContain('🟰 Team A 1-1 Team B');
    // H2H summary uses ctx.t('predict-recomm-win', { team: '' }) which returns " to win"
    expect(message).toContain('Team A: 1');
    expect(message).toContain('Draw');
    expect(message).toContain('Team B: 1');
  });

  it('should handle full stats stub correctly', async () => {
    (ctx.update as Record<string, unknown>).callback_query = {
      data: 'stats:full:123',
      from: { id: 1 },
    };
    ctx.match = ['stats:full:123', '123'];

    await runMiddleware(ctx);

    expect(ctx.answerCallbackQuery).toHaveBeenCalledWith({
      text: 'Detailed statistics will be available soon!',
      show_alert: true,
    });
  });

  it('should handle "message is not modified" error gracefully in basic stats', async () => {
    (ctx.update as Record<string, unknown>).callback_query = {
      data: 'stats:basic:123',
      from: { id: 1 },
    };
    ctx.match = ['stats:basic:123', '123'];

    mockMatchService.getMatchDetails.mockResolvedValue({
      id: 123,
      homeTeam: 'A',
      awayTeam: 'B',
      homeTeamId: 1,
      awayTeamId: 2,
      competitionCode: 'PL',
    });
    mockMatchService.getTeamLastMatches.mockResolvedValue([]);

    (ctx.editMessageText as ReturnType<typeof vi.fn>).mockRejectedValue({
      description: 'message is not modified',
    });

    await runMiddleware(ctx);

    expect(ctx.answerCallbackQuery).toHaveBeenCalled();
  });
});
