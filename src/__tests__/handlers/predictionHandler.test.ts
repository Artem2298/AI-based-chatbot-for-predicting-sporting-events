import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPredictionComposer } from '../../bot/handlers/predictionHandler';
import { userMatchesState } from '../../bot/handlers/matchHandler';
import { MatchService } from '@/services/matchService';
import { PredictionService } from '@/services/prediction';
import { Match } from '@/types/match.types';
import { createMockCtx } from '../helpers/mockContext';

// Mock DbService
vi.mock('@/services/dbService', () => ({
  DbService: {
    getUserByTelegramId: vi.fn().mockResolvedValue({ id: 1 }),
    getInstance: vi.fn(),
  },
  db: {
    user: { upsert: vi.fn() },
    prediction: { findUnique: vi.fn(), upsert: vi.fn() },
    userPrediction: { upsert: vi.fn() },
  },
}));

describe('predictionHandler', () => {
  let mockMatchService: { getMatchDetails: ReturnType<typeof vi.fn> };
  let mockPredictionService: { generatePrediction: ReturnType<typeof vi.fn> };
  let composer: ReturnType<typeof createPredictionComposer>;
  let ctx: ReturnType<typeof createMockCtx>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockMatchService = {
      getMatchDetails: vi.fn(),
    };

    mockPredictionService = {
      generatePrediction: vi.fn(),
    };

    composer = createPredictionComposer(
      mockMatchService as unknown as MatchService,
      mockPredictionService as unknown as PredictionService
    );

    ctx = createMockCtx();
    // Add grammY-specific methods used by predictionHandler
    (ctx as Record<string, unknown>).replyWithAnimation = vi
      .fn()
      .mockResolvedValue({ message_id: 999 });
    (ctx as Record<string, unknown>).chat = { id: 12345 };
    (ctx as Record<string, unknown>).api = {
      deleteMessage: vi.fn().mockResolvedValue(true),
    };

    userMatchesState.set(1, {
      matches: [{ id: 123 }, { id: 456 }] as unknown as Match[],
      leagueCode: 'PL',
      currentPage: 0,
    });
  });

  async function runMiddleware(context: typeof ctx) {
    await composer.middleware()(context as never, () => Promise.resolve());
  }

  it('should show prediction type menu on predict:matchId', async () => {
    (ctx.update as Record<string, unknown>).callback_query = {
      data: 'predict:123',
      from: { id: 1 },
    };
    ctx.match = ['predict:123', '123'];

    await runMiddleware(ctx);

    expect(ctx.answerCallbackQuery).toHaveBeenCalled();
    expect(ctx.reply).toHaveBeenCalled();
    const message = (ctx.reply as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(message).toContain('Match outcome');
    expect(message).toContain('Total goals (O/U 2.5)');
    expect(message).toContain('Both team to score');
  });

  it('should handle outcome prediction generation', async () => {
    (ctx.update as Record<string, unknown>).callback_query = {
      data: 'predict_type:outcome:123',
      from: { id: 1 },
    };
    ctx.match = ['predict_type:outcome:123', 'outcome', '123'];

    mockMatchService.getMatchDetails.mockResolvedValue({
      id: 123,
      homeTeam: 'Team A',
      awayTeam: 'Team B',
      date: new Date(),
    });

    mockPredictionService.generatePrediction.mockResolvedValue({
      type: 'outcome',
      recommendation: '1',
      homeWin: 70,
      draw: 20,
      awayWin: 10,
      confidence: 85,
      reasoning: 'Strong home form',
    });

    await runMiddleware(ctx);

    expect(ctx.answerCallbackQuery).toHaveBeenCalled();
    expect(mockPredictionService.generatePrediction).toHaveBeenCalledWith(
      123,
      'outcome',
      undefined,
      1
    );
    // ctx.reply called twice: loading message + formatted result
    expect(ctx.reply).toHaveBeenCalledTimes(2);
    const resultMessage = (ctx.reply as ReturnType<typeof vi.fn>).mock
      .calls[1][0];
    expect(resultMessage).toContain('Match outcome');
    expect(resultMessage).toContain('Team A to win');
  });

  it('should handle insufficient data error during prediction', async () => {
    (ctx.update as Record<string, unknown>).callback_query = {
      data: 'predict_type:outcome:123',
      from: { id: 1 },
    };
    ctx.match = ['predict_type:outcome:123', 'outcome', '123'];

    mockMatchService.getMatchDetails.mockResolvedValue({
      id: 123,
      homeTeam: 'A',
      awayTeam: 'B',
      date: new Date(),
    });

    mockPredictionService.generatePrediction.mockRejectedValue(
      new Error('Insufficient data')
    );

    await runMiddleware(ctx);

    // ctx.reply called twice: loading message + error message
    expect(ctx.reply).toHaveBeenCalledTimes(2);
    const errorMessage = (ctx.reply as ReturnType<typeof vi.fn>).mock
      .calls[1][0];
    expect(errorMessage).toContain('Error generating prediction.');
    expect(errorMessage).toContain('Insufficient stats for');
  });
});
