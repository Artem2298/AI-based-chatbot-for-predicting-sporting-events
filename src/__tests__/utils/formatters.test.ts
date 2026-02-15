import { describe, it, expect } from 'vitest';
import { formatDate, formatTime, formatMatchesList, formatMatchResult, getResultEmoji } from '@/bot/utils/formatters';
import { Match, MatchWithScore } from '@/types/match.types';

describe('formatters', () => {
  describe('formatDate', () => {
    it('should format date correctly in ru-RU locale', () => {
      const date = new Date(2023, 9, 25); // 2023-10-25
      // The result might depend on the environment's locale settings,
      // but ru-RU should be 25.10.2023
      expect(formatDate(date)).toBe('25.10.2023');
    });
  });

  describe('formatTime', () => {
    it('should format time correctly in ru-RU locale', () => {
      const date = new Date(2023, 9, 25, 15, 30);
      expect(formatTime(date)).toBe('15:30');
    });
  });

  describe('formatMatchResult', () => {
    it('should format match result with scores', () => {
      const match: MatchWithScore = {
        id: 1,
        homeTeam: 'Team A',
        awayTeam: 'Team B',
        homeTeamId: 1,
        awayTeamId: 2,
        status: 'FINISHED',
        date: new Date(),
        competition: 'League',
        competitionCode: 'PL',
        score: { home: 2, away: 1 }
      };
      expect(formatMatchResult(match)).toBe('Team A 2-1 Team B');
    });

    it('should format match result without scores as vs', () => {
      const match: MatchWithScore = {
        id: 1,
        homeTeam: 'Team A',
        awayTeam: 'Team B',
        homeTeamId: 1,
        awayTeamId: 2,
        status: 'SCHEDULED',
        date: new Date(),
        competition: 'League',
        competitionCode: 'PL',
        score: { home: null as unknown as number, away: null as unknown as number }
      };
      expect(formatMatchResult(match)).toBe('Team A vs Team B');
    });
  });

  describe('getResultEmoji', () => {
    const match: MatchWithScore = {
      id: 1, homeTeam: 'Team A', awayTeam: 'Team B', date: new Date(), competition: 'L', competitionCode: 'PL',
      homeTeamId: 1, awayTeamId: 2, status: 'FINISHED',
      score: { home: 2, away: 1 }
    };

    it('should return \u2705 for win', () => {
      expect(getResultEmoji(match, 'Team A')).toBe('\u2705');
    });

    it('should return \u274c for loss', () => {
      expect(getResultEmoji(match, 'Team B')).toBe('\u274c');
    });

    it('should return \ud83d\udff0 for draw', () => {
      const drawMatch = { ...match, score: { home: 1, away: 1 } };
      expect(getResultEmoji(drawMatch, 'Team A')).toBe('\ud83d\udff0');
    });
  });

  describe('formatMatchesList', () => {
    it('should format matches list grouped by date', () => {
      const matches: Match[] = [
        { id: 1, homeTeam: 'A', awayTeam: 'B', date: new Date(2023, 9, 25, 12, 0), competition: 'L', competitionCode: 'PL', homeTeamId: 1, awayTeamId: 2, status: 'TIMED' },
        { id: 2, homeTeam: 'C', awayTeam: 'D', date: new Date(2023, 9, 25, 14, 0), competition: 'L', competitionCode: 'PL', homeTeamId: 3, awayTeamId: 4, status: 'TIMED' },
        { id: 3, homeTeam: 'E', awayTeam: 'F', date: new Date(2023, 9, 26, 10, 0), competition: 'L', competitionCode: 'PL', homeTeamId: 5, awayTeamId: 6, status: 'TIMED' }
      ];

      const result = formatMatchesList(matches, 0);
      expect(result).toContain('\ud83d\udcc5 **25.10.2023**');
      expect(result).toContain('1. A vs B (12:00)');
      expect(result).toContain('2. C vs D (14:00)');
      expect(result).toContain('\ud83d\udcc5 **26.10.2023**');
      expect(result).toContain('3. E vs F (10:00)');
    });
  });
});
