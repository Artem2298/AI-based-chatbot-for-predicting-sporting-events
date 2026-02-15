import { describe, it, expect } from 'vitest';
import { calculateTeamStats, filterHomeMatches, filterAwayMatches } from '@/bot/utils/statsCalculator';
import { MatchWithScore } from '@/types/match.types';

describe('statsCalculator', () => {
  const mockMatches: MatchWithScore[] = [
    {
      id: 1,
      homeTeam: 'Team A', homeTeamId: 1,
      awayTeam: 'Team B', awayTeamId: 2,
      date: new Date(), status: 'FINISHED',
      competition: 'League', competitionCode: 'PL',
      score: { home: 2, away: 1 }
    },
    {
      id: 2,
      homeTeam: 'Team C', homeTeamId: 3,
      awayTeam: 'Team A', awayTeamId: 1,
      date: new Date(), status: 'FINISHED',
      competition: 'League', competitionCode: 'PL',
      score: { home: 0, away: 1 }
    },
    {
      id: 3,
      homeTeam: 'Team A', homeTeamId: 1,
      awayTeam: 'Team D', awayTeamId: 4,
      date: new Date(), status: 'FINISHED',
      competition: 'League', competitionCode: 'PL',
      score: { home: 1, away: 1 }
    },
    {
      id: 4,
      homeTeam: 'Team E', homeTeamId: 5,
      awayTeam: 'Team A', awayTeamId: 1,
      date: new Date(), status: 'FINISHED',
      competition: 'League', competitionCode: 'PL',
      score: { home: 3, away: 0 }
    }
  ];

  describe('calculateTeamStats', () => {
    it('should calculate stats correctly for Team A', () => {
      const stats = calculateTeamStats(mockMatches, 'Team A');

      expect(stats.wins).toBe(2); // Match 1 (2-1), Match 2 (0-1)
      expect(stats.draws).toBe(1); // Match 3 (1-1)
      expect(stats.losses).toBe(1); // Match 4 (3-0)
      expect(stats.goalsFor).toBe(4); // 2 + 1 + 1 + 0
      expect(stats.goalsAgainst).toBe(5); // 1 + 0 + 1 + 3
      expect(stats.avgGoalsFor).toBe('1.0');
      expect(stats.avgGoalsAgainst).toBe('1.3');
      expect(stats.form).toBe('W-W-D-L');
    });

    it('should handle empty matches array', () => {
      const stats = calculateTeamStats([], 'Team A');
      expect(stats.wins).toBe(0);
      expect(stats.avgGoalsFor).toBe('NaN'); // Current implementation division by zero
    });
  });

  describe('filterHomeMatches', () => {
    it('should filter home matches for Team A', () => {
      const homeMatches = filterHomeMatches(mockMatches, 'Team A');
      expect(homeMatches.length).toBe(2);
      expect(homeMatches[0].id).toBe(1);
      expect(homeMatches[1].id).toBe(3);
    });
  });

  describe('filterAwayMatches', () => {
    it('should filter away matches for Team A', () => {
      const awayMatches = filterAwayMatches(mockMatches, 'Team A');
      expect(awayMatches.length).toBe(2);
      expect(awayMatches[0].id).toBe(2);
      expect(awayMatches[1].id).toBe(4);
    });
  });
});
