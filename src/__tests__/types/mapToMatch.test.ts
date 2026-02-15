import { describe, it, expect } from 'vitest';
import { mapToMatch } from '@/types/match.types';
import { FootballDataMatch } from '@/api/football-data/types';

describe('mapToMatch', () => {
  it('should correctly map FootballDataMatch to Match', () => {
    const apiMatch: FootballDataMatch = {
      id: 123,
      utcDate: '2024-01-15T15:00:00Z',
      status: 'SCHEDULED',
      matchday: 20,
      stage: 'REGULAR_SEASON',
      group: null,
      lastUpdated: '2024-01-14T10:00:00Z',
      area: { id: 1, name: 'England', code: 'ENG', flag: '' },
      competition: {
        id: 2021,
        name: 'Premier League',
        code: 'PL',
        type: 'LEAGUE',
        emblem: '',
      },
      season: {
        id: 1,
        startDate: '2023-08-01',
        endDate: '2024-05-31',
        currentMatchday: 20,
        winner: null,
      },
      homeTeam: {
        id: 57,
        name: 'Arsenal FC',
        shortName: 'Arsenal',
        tla: 'ARS',
        crest: '',
      },
      awayTeam: {
        id: 65,
        name: 'Manchester City FC',
        shortName: 'Man City',
        tla: 'MCI',
        crest: '',
      },
      score: {
        winner: null,
        duration: 'REGULAR',
        fullTime: { home: null, away: null },
        halfTime: { home: null, away: null },
      },
      odds: { msg: '' },
      referees: [],
    };

    const result = mapToMatch(apiMatch);

    expect(result.id).toBe(123);
    expect(result.homeTeam).toBe('Arsenal FC');
    expect(result.homeTeamId).toBe(57);
    expect(result.awayTeam).toBe('Manchester City FC');
    expect(result.awayTeamId).toBe(65);
    expect(result.date).toEqual(new Date('2024-01-15T15:00:00Z'));
    expect(result.status).toBe('SCHEDULED');
    expect(result.competition).toBe('Premier League');
    expect(result.competitionCode).toBe('PL');
  });

  it('should handle finished match status', () => {
    const apiMatch = {
      id: 456,
      utcDate: '2024-01-10T20:00:00Z',
      status: 'FINISHED',
      matchday: 19,
      stage: 'REGULAR_SEASON',
      group: null,
      lastUpdated: '',
      area: { id: 1, name: 'Spain', code: 'ESP', flag: '' },
      competition: {
        id: 2014,
        name: 'La Liga',
        code: 'PD',
        type: 'LEAGUE',
        emblem: '',
      },
      season: {
        id: 1,
        startDate: '2023-08-01',
        endDate: '2024-05-31',
        currentMatchday: 19,
        winner: null,
      },
      homeTeam: {
        id: 86,
        name: 'Real Madrid CF',
        shortName: 'Real Madrid',
        tla: 'RMA',
        crest: '',
      },
      awayTeam: {
        id: 81,
        name: 'FC Barcelona',
        shortName: 'Barcelona',
        tla: 'FCB',
        crest: '',
      },
      score: {
        winner: 'HOME_TEAM',
        duration: 'REGULAR',
        fullTime: { home: 3, away: 1 },
        halfTime: { home: 1, away: 0 },
      },
      odds: { msg: '' },
      referees: [],
    } as FootballDataMatch;

    const result = mapToMatch(apiMatch);

    expect(result.status).toBe('FINISHED');
    expect(result.homeTeam).toBe('Real Madrid CF');
    expect(result.awayTeam).toBe('FC Barcelona');
    expect(result.competitionCode).toBe('PD');
  });
});
