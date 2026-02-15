import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createStandingsComposer } from '../../bot/handlers/standingsHandler';
import { MatchService } from '@/services/matchService';
import { createMockCtx } from '../helpers/mockContext';

describe('standingsHandler', () => {
  let mockMatchService: { getStandings: ReturnType<typeof vi.fn> };
  let composer: ReturnType<typeof createStandingsComposer>;
  let ctx: ReturnType<typeof createMockCtx>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockMatchService = {
      getStandings: vi.fn(),
    };

    composer = createStandingsComposer(
      mockMatchService as unknown as MatchService
    );

    ctx = createMockCtx();
  });

  async function runMiddleware(context: typeof ctx) {
    await composer.middleware()(context as never, () => Promise.resolve());
  }

  it('should handle standings:leagueCode correctly', async () => {
    (ctx.update as Record<string, unknown>).callback_query = {
      data: 'standings:PL',
      from: { id: 1 },
    };
    ctx.match = ['standings:PL', 'PL'];

    mockMatchService.getStandings.mockResolvedValue({
      competition: { name: 'Premier League' },
      season: { startDate: '2023-08-01', endDate: '2024-05-31' },
      standings: [
        {
          table: [
            {
              position: 1,
              team: { name: 'Team A', shortName: 'A' },
              points: 10,
              playedGames: 4,
              won: 3,
              draw: 1,
              lost: 0,
              goalsFor: 10,
              goalsAgainst: 2,
              goalDifference: 8,
              form: 'W,W,W,D',
            },
            {
              position: 2,
              team: { name: 'Team B', shortName: 'B' },
              points: 9,
              playedGames: 4,
              won: 3,
              draw: 0,
              lost: 1,
              goalsFor: 8,
              goalsAgainst: 4,
              goalDifference: 4,
              form: 'W,L,W,W',
            },
          ],
        },
      ],
    });

    await runMiddleware(ctx);

    expect(ctx.answerCallbackQuery).toHaveBeenCalledWith({
      text: 'Loading standings...',
    });
    expect(mockMatchService.getStandings).toHaveBeenCalledWith('PL');
    expect(ctx.editMessageText).toHaveBeenCalled();
    const message = (ctx.editMessageText as ReturnType<typeof vi.fn>).mock
      .calls[0][0];
    expect(message).toContain('Standings: Premier League');
    expect(message).toContain('🥇 A');
    expect(message).toContain('🥈 B');
    expect(message).toContain('📈 ✅✅✅🟰');
  });

  it('should handle empty standings table', async () => {
    (ctx.update as Record<string, unknown>).callback_query = {
      data: 'standings:PL',
      from: { id: 1 },
    };
    ctx.match = ['standings:PL', 'PL'];

    mockMatchService.getStandings.mockResolvedValue({
      standings: [{ table: [] }],
    });

    await runMiddleware(ctx);

    expect(ctx.reply).toHaveBeenCalledWith('Standings not found');
  });

  it('should handle error fetching standings', async () => {
    (ctx.update as Record<string, unknown>).callback_query = {
      data: 'standings:PL',
      from: { id: 1 },
    };
    ctx.match = ['standings:PL', 'PL'];

    mockMatchService.getStandings.mockRejectedValue(new Error('API error'));

    await runMiddleware(ctx);

    // Source: ctx.reply(ctx.t('standings-error')) — no emoji appended
    expect(ctx.reply).toHaveBeenCalledWith('Error loading standings.');
  });
});
