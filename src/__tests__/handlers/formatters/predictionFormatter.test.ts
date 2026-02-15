import { describe, it, expect, vi } from 'vitest';
import {
  formatOutcomePrediction,
  formatCornersPrediction,
  formatCardsPrediction,
  formatOffsidesPrediction,
  formatTotalPrediction,
  formatBttsPrediction,
} from '@/bot/handlers/formatters/predictionFormatter';
import { createMockT } from '../../helpers/mockContext';
import type { TranslateFunction } from '@grammyjs/i18n';

// Mock formatters utils
vi.mock('@/bot/utils/formatters', () => ({
  formatDate: vi.fn(() => '25.10.2023'),
}));

describe('predictionFormatter', () => {
  const mockMatch = {
    id: 1,
    homeTeam: 'Team A',
    homeTeamId: 10,
    awayTeam: 'Team B',
    awayTeamId: 20,
    date: new Date(),
    status: 'SCHEDULED',
    competition: 'Premier League',
    competitionCode: 'PL',
  };

  const t = createMockT() as unknown as TranslateFunction;

  describe('formatOutcomePrediction', () => {
    it('should format home win prediction correctly', () => {
      const prediction = {
        type: 'outcome' as const,
        recommendation: '1' as const,
        homeWin: 60,
        draw: 20,
        awayWin: 20,
        confidence: 80,
        reasoning: 'Test reasoning',
      };

      const result = formatOutcomePrediction(mockMatch, prediction, t);

      expect(result).toContain('Match outcome');
      expect(result).toContain('Team A vs Team B');
      expect(result).toContain('RECOMMENDATION:');
      expect(result).toContain('Team A to win');
      expect(result).toContain('CONFIDENCE:');
      expect(result).toContain('80%');
      expect(result).toContain('█'.repeat(8));
      expect(result).toContain('Test reasoning');
      expect(result).toContain('PROBABILITIES:');
      expect(result).toContain('60%');
    });

    it('should format draw prediction correctly', () => {
      const prediction = {
        type: 'outcome' as const,
        recommendation: 'X' as const,
        homeWin: 30,
        draw: 40,
        awayWin: 30,
        confidence: 50,
        reasoning: 'Draw reasoning',
      };

      const result = formatOutcomePrediction(mockMatch, prediction, t);
      expect(result).toContain('🤝');
      expect(result).toContain('RECOMMENDATION:');
      expect(result).toContain('Draw');
    });

    it('should format away win prediction correctly', () => {
      const prediction = {
        type: 'outcome' as const,
        recommendation: '2' as const,
        homeWin: 20,
        draw: 20,
        awayWin: 60,
        confidence: 70,
        reasoning: 'Away reasoning',
      };

      const result = formatOutcomePrediction(mockMatch, prediction, t);
      expect(result).toContain('✈️');
      expect(result).toContain('RECOMMENDATION:');
      expect(result).toContain('Team B to win');
    });
  });

  describe('formatCornersPrediction', () => {
    it('should format corners prediction correctly', () => {
      const prediction = {
        type: 'corners' as const,
        totalOver9_5: 70,
        totalUnder9_5: 30,
        homeTeamOver5_5: 60,
        awayTeamOver4_5: 40,
        expectedTotal: 10,
        expectedHome: 6,
        expectedAway: 4,
        recommendation: 'Over 9.5',
        confidence: 75,
        reasoning: 'Corner reasoning',
      };

      const result = formatCornersPrediction(mockMatch, prediction, t);
      expect(result).toContain('Corners');
      expect(result).toContain('Total Over 9.5:');
      expect(result).toContain('70%');
      expect(result).toContain('Total Under 9.5:');
      expect(result).toContain('30%');
      expect(result).toContain('Corner reasoning');
      expect(result).toContain('Team A > 5.5: 60%');
      expect(result).toContain('Team B > 4.5: 40%');
    });
  });

  describe('formatCardsPrediction', () => {
    it('should format cards prediction correctly', () => {
      const prediction = {
        type: 'cards' as const,
        totalOver3_5: 65,
        totalUnder3_5: 35,
        homeTeamOver1_5: 50,
        awayTeamOver1_5: 50,
        expectedYellow: 3,
        expectedRed: 1,
        expectedTotal: 4,
        recommendation: 'Over 3.5',
        confidence: 60,
        reasoning: 'Card reasoning',
      };

      const result = formatCardsPrediction(mockMatch, prediction, t);
      expect(result).toContain('Cards');
      expect(result).toContain('Total Over 3.5:');
      expect(result).toContain('65%');
      expect(result).toContain('- Yellow Cards:');
      expect(result).toContain('3');
      expect(result).toContain('- Red Cards:');
      expect(result).toContain('1');
    });
  });

  describe('formatOffsidesPrediction', () => {
    it('should format offsides prediction correctly', () => {
      const prediction = {
        type: 'offsides' as const,
        totalOver3_5: 55,
        totalUnder3_5: 45,
        homeTeamOver1_5: 40,
        awayTeamOver1_5: 60,
        expectedTotal: 5,
        expectedHome: 2,
        expectedAway: 3,
        recommendation: 'Under 3.5',
        confidence: 50,
        reasoning: 'Offside reasoning',
      };

      const result = formatOffsidesPrediction(mockMatch, prediction, t);
      expect(result).toContain('Offsides');
      expect(result).toContain('Total Over 3.5:');
      expect(result).toContain('55%');
      expect(result).toContain('Total Under 3.5:');
      expect(result).toContain('45%');
      expect(result).toContain('Offside reasoning');
    });
  });

  describe('formatTotalPrediction', () => {
    it('should format total goals prediction correctly', () => {
      const prediction = {
        type: 'total' as const,
        totalOver2_5: 80,
        totalUnder2_5: 20,
        expectedTotalGoals: 3.2,
        expectedHomeGoals: 2.1,
        expectedAwayGoals: 1.1,
        recommendation: 'Over 2.5 Goals',
        confidence: 85,
        reasoning: 'Total reasoning',
      };

      const result = formatTotalPrediction(mockMatch, prediction, t);
      expect(result).toContain('Total goals (O/U 2.5)');
      expect(result).toContain('Over 2.5:');
      expect(result).toContain('80%');
      expect(result).toContain('Under 2.5:');
      expect(result).toContain('20%');
      expect(result).toContain('Expected total goals:');
      expect(result).toContain('3.2');
      expect(result).toContain('Total reasoning');
    });
  });

  describe('formatBttsPrediction', () => {
    it('should format btts prediction correctly', () => {
      const prediction = {
        type: 'btts' as const,
        bothTeamsToScoreYes: 75,
        bothTeamsToScoreNo: 25,
        expectedHomeGoals: 2.1,
        expectedAwayGoals: 1.1,
        recommendation: 'Both Teams To Score',
        confidence: 70,
        reasoning: 'BTTS reasoning',
      };

      const result = formatBttsPrediction(mockMatch, prediction, t);
      expect(result).toContain('Both team to score');
      expect(result).toContain('Both teams score - Yes:');
      expect(result).toContain('75%');
      expect(result).toContain('Both teams score - No:');
      expect(result).toContain('25%');
      expect(result).toContain('BTTS reasoning');
    });
  });
});
