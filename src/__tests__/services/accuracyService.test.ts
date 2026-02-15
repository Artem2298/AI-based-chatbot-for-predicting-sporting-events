import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AccuracyService } from '@/services/accuracyService';

// Mock dbService
const mockFindMany = vi.fn();
const mockCreate = vi.fn();
const mockFindManyAccuracy = vi.fn();

vi.mock('@/services/dbService', () => ({
  db: {
    prediction: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
    },
    predictionAccuracy: {
      create: (...args: unknown[]) => mockCreate(...args),
      findMany: (...args: unknown[]) => mockFindManyAccuracy(...args),
    },
  },
}));

describe('AccuracyService', () => {
  let service: AccuracyService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AccuracyService();
  });

  describe('evaluateMatch', () => {
    it('should skip if no predictions found', async () => {
      mockFindMany.mockResolvedValue([]);

      await service.evaluateMatch(1, 2, 1);

      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('should skip if accuracy already exists', async () => {
      mockFindMany.mockResolvedValue([
        {
          id: 1,
          matchId: 1,
          type: 'outcome',
          content: { recommendation: '1' },
          accuracy: { id: 1 }, // already has accuracy
        },
      ]);

      await service.evaluateMatch(1, 2, 1);

      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('should evaluate outcome prediction correctly (home win)', async () => {
      mockFindMany.mockResolvedValue([
        {
          id: 1,
          matchId: 1,
          type: 'outcome',
          content: { recommendation: '1' },
          accuracy: null,
        },
      ]);
      mockCreate.mockResolvedValue({});

      await service.evaluateMatch(1, 2, 1); // home wins 2-1

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          outcomeCorrect: true,
          goalsOverUnderCorrect: null,
          bttsCorrect: null,
        }),
      });
    });

    it('should evaluate outcome prediction correctly (draw)', async () => {
      mockFindMany.mockResolvedValue([
        {
          id: 2,
          matchId: 1,
          type: 'outcome',
          content: { recommendation: 'X' },
          accuracy: null,
        },
      ]);
      mockCreate.mockResolvedValue({});

      await service.evaluateMatch(1, 1, 1); // draw 1-1

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          outcomeCorrect: true,
        }),
      });
    });

    it('should evaluate outcome prediction as incorrect', async () => {
      mockFindMany.mockResolvedValue([
        {
          id: 3,
          matchId: 1,
          type: 'outcome',
          content: { recommendation: '1' },
          accuracy: null,
        },
      ]);
      mockCreate.mockResolvedValue({});

      await service.evaluateMatch(1, 0, 2); // away wins 0-2

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          outcomeCorrect: false,
        }),
      });
    });

    it('should evaluate total prediction correctly (over 2.5)', async () => {
      mockFindMany.mockResolvedValue([
        {
          id: 4,
          matchId: 1,
          type: 'total',
          content: { totalOver2_5: 80, totalUnder2_5: 20 },
          accuracy: null,
        },
      ]);
      mockCreate.mockResolvedValue({});

      await service.evaluateMatch(1, 2, 1); // total 3 > 2.5

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          goalsOverUnderCorrect: true,
          outcomeCorrect: null,
          bttsCorrect: null,
        }),
      });
    });

    it('should evaluate total prediction as incorrect', async () => {
      mockFindMany.mockResolvedValue([
        {
          id: 5,
          matchId: 1,
          type: 'total',
          content: { totalOver2_5: 80, totalUnder2_5: 20 },
          accuracy: null,
        },
      ]);
      mockCreate.mockResolvedValue({});

      await service.evaluateMatch(1, 1, 0); // total 1 < 2.5, predicted over

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          goalsOverUnderCorrect: false,
        }),
      });
    });

    it('should evaluate btts prediction correctly (yes)', async () => {
      mockFindMany.mockResolvedValue([
        {
          id: 6,
          matchId: 1,
          type: 'btts',
          content: { bothTeamsToScoreYes: 70, bothTeamsToScoreNo: 30 },
          accuracy: null,
        },
      ]);
      mockCreate.mockResolvedValue({});

      await service.evaluateMatch(1, 2, 1); // both scored

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          bttsCorrect: true,
          outcomeCorrect: null,
          goalsOverUnderCorrect: null,
        }),
      });
    });

    it('should evaluate btts prediction correctly (no)', async () => {
      mockFindMany.mockResolvedValue([
        {
          id: 7,
          matchId: 1,
          type: 'btts',
          content: { bothTeamsToScoreYes: 30, bothTeamsToScoreNo: 70 },
          accuracy: null,
        },
      ]);
      mockCreate.mockResolvedValue({});

      await service.evaluateMatch(1, 1, 0); // only home scored

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          bttsCorrect: true, // predicted no btts, and only one team scored
        }),
      });
    });

    it('should handle backward compat with old goals type', async () => {
      mockFindMany.mockResolvedValue([
        {
          id: 8,
          matchId: 1,
          type: 'goals',
          content: {
            totalOver2_5: 60,
            totalUnder2_5: 40,
            bothTeamsToScoreYes: 70,
            bothTeamsToScoreNo: 30,
          },
          accuracy: null,
        },
      ]);
      mockCreate.mockResolvedValue({});

      await service.evaluateMatch(1, 2, 1); // total 3, both scored

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          goalsOverUnderCorrect: true,
          bttsCorrect: true,
          outcomeCorrect: null,
        }),
      });
    });

    it('should handle db error gracefully', async () => {
      mockFindMany.mockResolvedValue([
        {
          id: 9,
          matchId: 1,
          type: 'outcome',
          content: { recommendation: '1' },
          accuracy: null,
        },
      ]);
      mockCreate.mockRejectedValue(new Error('DB error'));

      // Should not throw
      await service.evaluateMatch(1, 2, 1);
    });
  });

  describe('getAccuracyStats', () => {
    it('should return correct percentages', async () => {
      mockFindManyAccuracy.mockResolvedValue([
        { outcomeCorrect: true, goalsOverUnderCorrect: null, bttsCorrect: null },
        { outcomeCorrect: false, goalsOverUnderCorrect: null, bttsCorrect: null },
        { outcomeCorrect: null, goalsOverUnderCorrect: true, bttsCorrect: null },
        { outcomeCorrect: null, goalsOverUnderCorrect: true, bttsCorrect: null },
        { outcomeCorrect: null, goalsOverUnderCorrect: false, bttsCorrect: null },
        { outcomeCorrect: null, goalsOverUnderCorrect: null, bttsCorrect: true },
      ]);

      const stats = await service.getAccuracyStats();

      expect(stats.outcome.total).toBe(2);
      expect(stats.outcome.correct).toBe(1);
      expect(stats.outcome.percentage).toBe(50);

      expect(stats.goals.total).toBe(3);
      expect(stats.goals.correct).toBe(2);
      expect(stats.goals.percentage).toBe(67);

      expect(stats.btts.total).toBe(1);
      expect(stats.btts.correct).toBe(1);
      expect(stats.btts.percentage).toBe(100);
    });

    it('should handle empty data', async () => {
      mockFindManyAccuracy.mockResolvedValue([]);

      const stats = await service.getAccuracyStats();

      expect(stats.outcome.total).toBe(0);
      expect(stats.outcome.percentage).toBe(0);
      expect(stats.goals.total).toBe(0);
      expect(stats.btts.total).toBe(0);
    });
  });
});
