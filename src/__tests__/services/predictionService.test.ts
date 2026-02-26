import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PredictionService } from '../../services/prediction';
import { StatsCalculator } from '../../services/prediction/statsCalculator';
import { PredictionValidator } from '../../services/prediction/predictionValidator';
import { MatchService } from '../../services/matchService';
import { GeminiClient } from '@/api/ai/geminiClient';
import {
  DetailedMatchStats,
  MatchOutcomePrediction,
} from '@/types/prediction.types';
import * as promptLoader from '@/utils/promptLoader';

// Mock dependencies
vi.mock('@/services/matchService');
vi.mock('@/api/ai/geminiClient');
vi.mock('@/utils/promptLoader');
vi.mock('@/services/dbService', () => ({
  db: {
    prediction: {
      findUnique: vi.fn().mockResolvedValue(null),
      upsert: vi.fn().mockResolvedValue({ id: 1 }),
    },
    userPrediction: {
      upsert: vi.fn().mockResolvedValue({}),
    },
  },
  DbService: {
    getInstance: vi.fn(),
  },
}));

describe('StatsCalculator', () => {
  let stats: StatsCalculator;

  beforeEach(() => {
    stats = new StatsCalculator();
  });

  describe('calculateGeneralStats', () => {
    it('should calculate stats correctly from match list', () => {
      const mockMatches: DetailedMatchStats[] = [
        {
          result: 'W',
          goalsScored: 2,
          goalsConceded: 1,
          opponent: 'X',
          wasHome: true,
        },
        {
          result: 'D',
          goalsScored: 1,
          goalsConceded: 1,
          opponent: 'Y',
          wasHome: false,
        },
        {
          result: 'L',
          goalsScored: 0,
          goalsConceded: 2,
          opponent: 'Z',
          wasHome: true,
        },
      ];

      const result = stats.calculateGeneralStats(mockMatches);

      expect(result.wins).toBe(1);
      expect(result.draws).toBe(1);
      expect(result.losses).toBe(1);
      expect(result.goalsFor).toBe(3);
      expect(result.goalsAgainst).toBe(4);
      expect(result.avgGoalsFor).toBe('1.00');
    });
  });

  // describe('calculateSimpleStats', () => {
  //   it('should calculate average correctly', () => {
  //     const mockMatches: DetailedMatchStats[] = [
  //       {
  //         result: 'W',
  //         goalsScored: 1,
  //         goalsConceded: 0,
  //         opponent: 'X',
  //         wasHome: true,
  //         // corners: 5,
  //       },
  //       {
  //         result: 'D',
  //         goalsScored: 0,
  //         goalsConceded: 0,
  //         opponent: 'Y',
  //         wasHome: false,
  //         // corners: 7,
  //       },
  //     ];
  //     const result = stats.calculateSimpleStats(mockMatches, 'corners');
  //     expect(result!.total).toBe(12);
  //     expect(result!.average).toBe(6);
  //   });

  //   it('should return null if no matches have the field', () => {
  //     const result = stats.calculateSimpleStats([], 'corners');
  //     expect(result).toBeNull();
  //   });
  // });
});

describe('PredictionValidator', () => {
  let validator: PredictionValidator;

  beforeEach(() => {
    validator = new PredictionValidator();
  });

  describe('validateAndNormalizeOutcomePrediction', () => {
    it('should fix probabilities if they dont sum to 100', () => {
      const prediction = {
        homeWin: 50,
        draw: 20,
        awayWin: 20, // Sum = 90
      };

      validator.validateAndNormalizeOutcomePrediction(prediction);

      expect(prediction.homeWin + prediction.draw + prediction.awayWin).toBe(
        100
      );
    });

    it('should throw error if fields are missing', () => {
      const prediction = { homeWin: 50 };
      expect(() =>
        validator.validateAndNormalizeOutcomePrediction(prediction)
      ).toThrow('Invalid outcome prediction format from AI');
    });
  });

  // it('should throw error for invalid corners prediction', () => {
  //   expect(() => validator.validateCornersPrediction({})).toThrow(
  //     'Invalid corners prediction format'
  //   );
  //   expect(() =>
  //     validator.validateCornersPrediction({
  //       totalOver9_5: 70,
  //       totalUnder9_5: 30,
  //     })
  //   ).toThrow('Missing expected values');
  // });

  // it('should throw error for invalid cards prediction', () => {
  //   expect(() => validator.validateCardsPrediction({})).toThrow(
  //     'Invalid cards prediction format'
  //   );
  //   expect(() =>
  //     validator.validateCardsPrediction({
  //       totalOver3_5: 60,
  //       totalUnder3_5: 40,
  //     })
  //   ).toThrow('Missing expected values');
  // });

  // it('should throw error for invalid offsides prediction', () => {
  //   expect(() => validator.validateOffsidesPrediction({})).toThrow(
  //     'Invalid offsides prediction format'
  //   );
  //   expect(() =>
  //     validator.validateOffsidesPrediction({
  //       totalOver3_5: 50,
  //       totalUnder3_5: 50,
  //     })
  //   ).toThrow('Missing expected values');
  // });

  it('should throw error for invalid total prediction', () => {
    expect(() => validator.validateTotalPrediction({})).toThrow(
      'Invalid total goals prediction format'
    );
  });

  it('should throw error for invalid btts prediction', () => {
    expect(() => validator.validateBttsPrediction({})).toThrow(
      'Invalid BTTS prediction format'
    );
  });
});

describe('PredictionService', () => {
  let predictionService: PredictionService;
  let mockMatchService: {
    getMatchDetails: ReturnType<typeof vi.fn>;
    getTeamLastMatches: ReturnType<typeof vi.fn>;
    getMatchWithDetailedStats: ReturnType<typeof vi.fn>;
  };
  let mockGeminiClient: {
    generateJSON: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockMatchService = {
      getMatchDetails: vi.fn(),
      getTeamLastMatches: vi.fn(),
      getMatchWithDetailedStats: vi.fn(),
    };

    mockGeminiClient = {
      generateJSON: vi.fn(),
    };

    predictionService = new PredictionService(
      mockMatchService as unknown as MatchService,
      mockGeminiClient as unknown as GeminiClient
    );
  });

  describe('generatePrediction', () => {
    it('should orchestrate the prediction flow correctly for outcome', async () => {
      const matchId = 123;
      mockMatchService.getMatchDetails.mockResolvedValue({
        id: matchId,
        homeTeam: 'Team A',
        awayTeam: 'Team B',
        homeTeamId: 1,
        awayTeamId: 2,
        competitionCode: 'PL',
      });
      mockMatchService.getTeamLastMatches.mockResolvedValue([
        {
          id: 1,
          homeTeam: 'Team A',
          awayTeam: 'Other',
          score: { home: 1, away: 0 },
        },
      ]);

      vi.spyOn(promptLoader, 'loadPrompt').mockResolvedValue('Prompt');
      mockGeminiClient.generateJSON.mockResolvedValue({
        homeWin: 60,
        draw: 20,
        awayWin: 20,
        recommendation: '1',
        confidence: 80,
        reasoning: 'test',
      });

      const result = await predictionService.generatePrediction(
        matchId,
        'outcome'
      );
      expect(result.type).toBe('outcome');
      expect((result as MatchOutcomePrediction).homeWin).toBe(60);
    });

    // it('should handle corners prediction correctly', async () => {
    //   const matchId = 123;
    //   mockMatchService.getMatchDetails.mockResolvedValue({
    //     id: matchId,
    //     homeTeam: 'A',
    //     awayTeam: 'B',
    //     homeTeamId: 1,
    //     awayTeamId: 2,
    //     competitionCode: 'PL',
    //   });
    //   mockMatchService.getTeamLastMatches.mockResolvedValue([
    //     {
    //       id: 1,
    //       homeTeam: 'A',
    //       awayTeam: 'X',
    //       score: { home: 1, away: 0 },
    //     },
    //   ]);
    //   mockMatchService.getMatchWithDetailedStats.mockResolvedValue({
    //     homeTeam: { id: 1, statistics: { corner_kicks: 5 } },
    //     awayTeam: { id: 10, statistics: { corner_kicks: 3 } },
    //   });

    //   vi.spyOn(promptLoader, 'loadPrompt').mockResolvedValue('Prompt');
    //   mockGeminiClient.generateJSON.mockResolvedValue({
    //     totalOver9_5: 70,
    //     totalUnder9_5: 30,
    //     expectedTotal: 10,
    //     expectedHome: 6,
    //     expectedAway: 4,
    //     homeTeamOver5_5: 60,
    //     awayTeamOver4_5: 40,
    //     recommendation: 'Over',
    //     confidence: 80,
    //     reasoning: 'test',
    //   });

    //   const result = await predictionService.generatePrediction(
    //     matchId,
    //     'corners'
    //   );
    //   expect(result.type).toBe('corners');
    // });

    it('should handle total prediction correctly', async () => {
      const matchId = 123;
      mockMatchService.getMatchDetails.mockResolvedValue({
        id: 1,
        homeTeam: 'A',
        awayTeam: 'B',
        homeTeamId: 1,
        awayTeamId: 2,
        competitionCode: 'PL',
      });
      mockMatchService.getTeamLastMatches.mockResolvedValue([
        {
          id: 1,
          homeTeam: 'A',
          awayTeam: 'X',
          score: { home: 1, away: 1 },
        },
      ]);

      vi.spyOn(promptLoader, 'loadPrompt').mockResolvedValue('Prompt');
      mockGeminiClient.generateJSON.mockResolvedValue({
        totalOver2_5: 80,
        totalUnder2_5: 20,
        expectedTotalGoals: 3.5,
        expectedHomeGoals: 2.1,
        expectedAwayGoals: 1.4,
        recommendation: 'Over 2.5 Goals',
        confidence: 85,
        reasoning: 'test',
      });

      const result = await predictionService.generatePrediction(
        matchId,
        'total'
      );
      expect(result.type).toBe('total');
    });

    it('should handle btts prediction correctly', async () => {
      const matchId = 123;
      mockMatchService.getMatchDetails.mockResolvedValue({
        id: 1,
        homeTeam: 'A',
        awayTeam: 'B',
        homeTeamId: 1,
        awayTeamId: 2,
        competitionCode: 'PL',
      });
      mockMatchService.getTeamLastMatches.mockResolvedValue([
        {
          id: 1,
          homeTeam: 'A',
          awayTeam: 'X',
          score: { home: 1, away: 1 },
        },
      ]);

      vi.spyOn(promptLoader, 'loadPrompt').mockResolvedValue('Prompt');
      mockGeminiClient.generateJSON.mockResolvedValue({
        bothTeamsToScoreYes: 75,
        bothTeamsToScoreNo: 25,
        expectedHomeGoals: 1.5,
        expectedAwayGoals: 1.2,
        recommendation: 'Both teams to score',
        confidence: 70,
        reasoning: 'test',
      });

      const result = await predictionService.generatePrediction(
        matchId,
        'btts'
      );
      expect(result.type).toBe('btts');
    });

    // it('should handle cards prediction correctly', async () => {
    //   const matchId = 123;
    //   mockMatchService.getMatchDetails.mockResolvedValue({
    //     id: 1,
    //     homeTeam: 'A',
    //     awayTeam: 'B',
    //     homeTeamId: 1,
    //     awayTeamId: 2,
    //     competitionCode: 'PL',
    //   });
    //   mockMatchService.getTeamLastMatches.mockResolvedValue([
    //     {
    //       id: 1,
    //       homeTeam: 'A',
    //       awayTeam: 'X',
    //       score: { home: 0, away: 0 },
    //     },
    //   ]);
    //   mockMatchService.getMatchWithDetailedStats.mockResolvedValue({
    //     homeTeam: {
    //       id: 1,
    //       statistics: { yellow_cards: 2, red_cards: 0 },
    //     },
    //     awayTeam: {
    //       id: 10,
    //       statistics: { yellow_cards: 1, red_cards: 0 },
    //     },
    //   });

    //   vi.spyOn(promptLoader, 'loadPrompt').mockResolvedValue('Prompt');
    //   mockGeminiClient.generateJSON.mockResolvedValue({
    //     totalOver3_5: 60,
    //     totalUnder3_5: 40,
    //     expectedTotal: 4,
    //     expectedYellow: 3,
    //     expectedRed: 1,
    //     homeTeamOver1_5: 50,
    //     awayTeamOver1_5: 50,
    //     recommendation: 'Over',
    //     confidence: 75,
    //     reasoning: 'test',
    //   });

    //   const result = await predictionService.generatePrediction(
    //     matchId,
    //     'cards'
    //   );
    //   expect(result.type).toBe('cards');
    // });

    // it('should handle offsides prediction correctly', async () => {
    //   const matchId = 123;
    //   mockMatchService.getMatchDetails.mockResolvedValue({
    //     id: 1,
    //     homeTeam: 'A',
    //     awayTeam: 'B',
    //     homeTeamId: 1,
    //     awayTeamId: 2,
    //     competitionCode: 'PL',
    //   });
    //   mockMatchService.getTeamLastMatches.mockResolvedValue([
    //     {
    //       id: 1,
    //       homeTeam: 'A',
    //       awayTeam: 'X',
    //       score: { home: 1, away: 0 },
    //     },
    //   ]);
    //   mockMatchService.getMatchWithDetailedStats.mockResolvedValue({
    //     homeTeam: { id: 1, statistics: { offsides: 2 } },
    //     awayTeam: { id: 10, statistics: { offsides: 3 } },
    //   });

    //   vi.spyOn(promptLoader, 'loadPrompt').mockResolvedValue('Prompt');
    //   mockGeminiClient.generateJSON.mockResolvedValue({
    //     totalOver3_5: 50,
    //     totalUnder3_5: 50,
    //     expectedTotal: 5,
    //     expectedHome: 2,
    //     expectedAway: 3,
    //     homeTeamOver1_5: 40,
    //     awayTeamOver1_5: 60,
    //     recommendation: 'test',
    //     confidence: 60,
    //     reasoning: 'test',
    //   });

    //   const result = await predictionService.generatePrediction(
    //     matchId,
    //     'offsides'
    //   );
    //   expect(result.type).toBe('offsides');
    // });
  });
});
