import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FootballDataClient } from '@/api/football-data/footballApi';

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
      get: vi.fn(),
    })),
  },
}));

vi.mock('@/config', () => ({
  config: {
    footballApi: {
      baseUrl: 'https://api.football-data.org/v4',
      apiKey: 'test-key',
    },
  },
}));

describe('FootballDataClient', () => {
  let client: FootballDataClient;
  let mockGet: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new FootballDataClient();
    mockGet = (
      client as unknown as { client: { get: ReturnType<typeof vi.fn> } }
    ).client.get;
  });

  describe('getUpcomingMatches', () => {
    it('should return matches from response and call correct endpoint', async () => {
      const mockMatches = [{ id: 1 }, { id: 2 }];
      mockGet.mockResolvedValue({ data: { matches: mockMatches } });

      const result = await client.getUpcomingMatches('PL');

      expect(mockGet).toHaveBeenCalledWith(
        '/competitions/PL/matches',
        expect.objectContaining({
          params: expect.objectContaining({
            status: 'SCHEDULED',
            dateFrom: expect.any(String),
            dateTo: expect.any(String),
          }),
        })
      );
      expect(result).toEqual({ matches: mockMatches });
    });

    it('should use provided dateFrom and dateTo when given', async () => {
      mockGet.mockResolvedValue({ data: { matches: [] } });

      await client.getUpcomingMatches('BL1', '2024-01-01', '2024-01-31');

      expect(mockGet).toHaveBeenCalledWith(
        '/competitions/BL1/matches',
        expect.objectContaining({
          params: expect.objectContaining({
            dateFrom: '2024-01-01',
            dateTo: '2024-01-31',
          }),
        })
      );
    });
  });

  describe('getFinishedMatches', () => {
    it('should return finished matches for a competition', async () => {
      const mockMatches = [{ id: 10, status: 'FINISHED' }];
      mockGet.mockResolvedValue({ data: { matches: mockMatches } });

      const result = await client.getFinishedMatches('PL');

      expect(mockGet).toHaveBeenCalledWith(
        '/competitions/PL/matches',
        expect.objectContaining({ params: { status: 'FINISHED' } })
      );
      expect(result).toEqual({ matches: mockMatches });
    });
  });

  describe('getMatch', () => {
    it('should return match data by ID', async () => {
      const mockMatch = {
        id: 123,
        homeTeam: { name: 'Arsenal' },
        awayTeam: { name: 'Chelsea' },
      };
      mockGet.mockResolvedValue({ data: mockMatch });

      const result = await client.getMatch(123);

      expect(mockGet).toHaveBeenCalledWith('/matches/123');
      expect(result).toEqual(mockMatch);
    });
  });

  describe('getTeamMatches', () => {
    it('should return team matches with default limit', async () => {
      const mockData = { matches: [{ id: 1 }] };
      mockGet.mockResolvedValue({ data: mockData });

      const result = await client.getTeamMatches(42, 5);

      expect(mockGet).toHaveBeenCalledWith(
        '/teams/42/matches',
        expect.objectContaining({
          params: { status: 'FINISHED', limit: 5 },
        })
      );
      expect(result).toEqual(mockData);
    });

    it('should include competitionId in params when provided', async () => {
      mockGet.mockResolvedValue({ data: { matches: [] } });

      await client.getTeamMatches(42, 10, 2021);

      expect(mockGet).toHaveBeenCalledWith(
        '/teams/42/matches',
        expect.objectContaining({
          params: { status: 'FINISHED', limit: 10, competitions: 2021 },
        })
      );
    });
  });

  describe('getHeadToHead', () => {
    it('should return H2H matches with given limit', async () => {
      const mockData = { matches: [{ id: 5 }, { id: 6 }] };
      mockGet.mockResolvedValue({ data: mockData });

      const result = await client.getHeadToHead(123, 5);

      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining('/matches/123/head2head?limit=5')
      );
      expect(result).toEqual(mockData);
    });
  });

  describe('getStandings', () => {
    it('should return standings with season filter', async () => {
      const mockData = { standings: [{ type: 'TOTAL' }] };
      mockGet.mockResolvedValue({ data: mockData });

      const result = await client.getStandings('PL', 2023);

      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining('/competitions/PL/standings?season=2023')
      );
      expect(result).toEqual(mockData);
    });

    it('should return standings without season filter', async () => {
      const mockData = { standings: [{ type: 'TOTAL' }] };
      mockGet.mockResolvedValue({ data: mockData });

      const result = await client.getStandings('PL');

      expect(mockGet).toHaveBeenCalledWith('/competitions/PL/standings');
      expect(result).toEqual(mockData);
    });
  });
});
