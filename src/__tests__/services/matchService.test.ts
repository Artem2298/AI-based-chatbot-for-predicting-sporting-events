import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MatchService } from '../../services/matchService';
import { FootballDataClient } from '@/api/football-data/footballApi';
import { CacheService } from '@/services/cacheService';

// Mock dependencies
vi.mock('@/api/football-data/footballApi');
vi.mock('@/services/cacheService');
vi.mock('@/services/dbService', () => ({
  db: {
    match: { findUnique: vi.fn().mockResolvedValue(null), upsert: vi.fn().mockResolvedValue({}) },
    team: { upsert: vi.fn().mockResolvedValue({}) },
    standing: { findUnique: vi.fn().mockResolvedValue(null), upsert: vi.fn().mockResolvedValue({}) },
    $transaction: vi.fn().mockResolvedValue([]),
  },
}));

describe('MatchService', () => {
  let matchService: MatchService;
  let mockApi: {
    getUpcomingMatches: ReturnType<typeof vi.fn>;
    getMatch: ReturnType<typeof vi.fn>;
    getTeamMatches: ReturnType<typeof vi.fn>;
    getHeadToHead: ReturnType<typeof vi.fn>;
    getStandings: ReturnType<typeof vi.fn>;
  };
  let mockCache: {
    get: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockApi = {
      getUpcomingMatches: vi.fn(),
      getMatch: vi.fn(),
      getTeamMatches: vi.fn(),
      getHeadToHead: vi.fn(),
      getStandings: vi.fn(),
    };

    mockCache = {
      get: vi.fn().mockReturnValue(null),
      set: vi.fn(),
      delete: vi.fn(),
    };

    matchService = new MatchService(
      mockApi as unknown as FootballDataClient,
      mockCache as unknown as CacheService
    );
  });

  describe('getCached', () => {
    it('should throw if fetchFn fails', async () => {
      const error = new Error('API Failure');

      const service = matchService as unknown as {
        getCached(key: string, fetchFn: () => Promise<unknown>): Promise<unknown>;
      };

      await expect(service.getCached('test', () => {
        throw error;
      })).rejects.toThrow('API Failure');
    });
  });

  describe('getUpcomingMatches', () => {
    it('should fetch matches from API and filter by date', async () => {
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 1);

      const mockMatches = [
        {
          id: 1,
          utcDate: futureDate.toISOString(),
          status: 'SCHEDULED',
          homeTeam: { id: 10, name: 'Team A' },
          awayTeam: { id: 20, name: 'Team B' },
          score: { fullTime: { home: null, away: null } },
          competition: { name: 'League', code: 'PL' },
        }
      ];

      mockApi.getUpcomingMatches.mockResolvedValue({ matches: mockMatches });

      const result = await matchService.getUpcomingMatches('PL', 7);

      expect(mockApi.getUpcomingMatches).toHaveBeenCalledWith('PL');
      expect(result).toHaveLength(1);
      expect(mockCache.set).toHaveBeenCalled();
    });

    it('should return cached data if available', async () => {
      const cachedData = [{ id: 1 }];
      mockCache.get.mockReturnValue(cachedData);

      const result = await matchService.getUpcomingMatches('PL', 7);

      expect(result).toBe(cachedData);
      expect(mockApi.getUpcomingMatches).not.toHaveBeenCalled();
    });
  });

  describe('getMatchDetails', () => {
    it('should return formatted match details', async () => {
      mockApi.getMatch.mockResolvedValue({
        id: 123,
        utcDate: new Date().toISOString(),
        status: 'SCHEDULED',
        homeTeam: { id: 10, name: 'H' },
        awayTeam: { id: 20, name: 'A' },
        score: { fullTime: { home: 1, away: 1 } },
        competition: { name: 'C', code: 'PL' }
      });

      const result = await matchService.getMatchDetails(123);
      expect(result.homeTeamId).toBe(10);
      expect(result.score.home).toBe(1);
    });
  });

  describe('getTeamIds', () => {
    it('should return home and away team IDs', async () => {
      mockApi.getMatch.mockResolvedValue({
        id: 123,
        utcDate: new Date().toISOString(),
        status: 'SCHEDULED',
        homeTeam: { id: 101, name: 'Home' },
        awayTeam: { id: 202, name: 'Away' },
        score: { fullTime: { home: null, away: null } },
        competition: { name: 'League', code: 'PL' }
      });

      const result = await matchService.getTeamIds(123);
      expect(result.homeTeamId).toBe(101);
      expect(result.awayTeamId).toBe(202);
    });
  });

  describe('getHeadToHead', () => {
    it('should fetch and filter finished H2H matches', async () => {
      const mockH2H = {
        matches: [
          {
            id: 1,
            status: 'FINISHED',
            utcDate: new Date().toISOString(),
            homeTeam: { id: 10, name: 'A' },
            awayTeam: { id: 20, name: 'B' },
            score: { fullTime: { home: 2, away: 0 } },
            competition: { name: 'PL', code: 'PL' }
          },
          {
            id: 2,
            status: 'SCHEDULED', // Should be filtered out
            utcDate: new Date().toISOString(),
            homeTeam: { id: 10, name: 'A' },
            awayTeam: { id: 20, name: 'B' },
            score: { fullTime: { home: null, away: null } },
            competition: { name: 'PL', code: 'PL' }
          }
        ]
      };

      mockApi.getHeadToHead.mockResolvedValue(mockH2H);

      const result = await matchService.getHeadToHead(123, 5);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });
  });

  describe('getStandings', () => {
    it('should fetch standings', async () => {
      const mockStandings = { table: [] };
      mockApi.getStandings.mockResolvedValue(mockStandings);

      const result = await matchService.getStandings('PL');
      expect(result).toBe(mockStandings);
    });
  });

  describe('getMatchWithDetailedStats', () => {
    it('should call getRawMatch', async () => {
      mockApi.getMatch.mockResolvedValue({
        id: 123,
        utcDate: new Date().toISOString(),
        status: 'FINISHED',
        homeTeam: { id: 10, name: 'H' },
        awayTeam: { id: 20, name: 'A' },
        score: { fullTime: { home: 1, away: 0 } },
        competition: { name: 'C', code: 'PL' }
      });
      const result = await matchService.getMatchWithDetailedStats(123);
      expect(result.id).toBe(123);
    });
  });
});
