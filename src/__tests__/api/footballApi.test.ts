import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FootballDataClient } from '@/api/football-data/footballApi';

// Mock axios
vi.mock('axios', () => {
  return {
    default: {
      create: vi.fn(() => ({
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() },
        },
        get: vi.fn(),
      })),
    },
  };
});

// Mock config
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
  let mockAxiosInstance: {
    get: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    client = new FootballDataClient();
    mockAxiosInstance = (client as unknown as { client: typeof mockAxiosInstance }).client;
  });

  describe('getUpcomingMatches', () => {
    it('should call the correct endpoint with filters', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: { matches: [] } });

      const competitionCode = 'PL';
      await client.getUpcomingMatches(competitionCode);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        `/competitions/${competitionCode}/matches`,
        expect.objectContaining({
          params: expect.objectContaining({
            status: 'SCHEDULED',
          }),
        })
      );
    });
  });

  describe('getMatch', () => {
    it('should fetch match details by ID', async () => {
      const mockResult = { id: 123, homeTeam: { name: 'A' } };
      mockAxiosInstance.get.mockResolvedValue({ data: mockResult });

      const result = await client.getMatch(123);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/matches/123');
      expect(result).toEqual(mockResult);
    });
  });

  describe('getTeamMatches', () => {
    it('should fetch team matches with limit', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: { matches: [] } });

      await client.getTeamMatches(1, 5);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/teams/1/matches',
        expect.objectContaining({
          params: { status: 'FINISHED', limit: 5 },
        })
      );
    });
  });

  describe('getCompetitions', () => {
    it('should fetch competitions list', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: { competitions: [] } });

      await client.getCompetitions();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/competitions');
    });
  });

  describe('getHeadToHead', () => {
    it('should fetch H2H data with limit', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: { matches: [] } });

      await client.getHeadToHead(123, 5);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        expect.stringContaining('/matches/123/head2head?limit=5')
      );
    });
  });

  describe('getStandings', () => {
    it('should fetch standings with season information', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: { standings: [] } });

      await client.getStandings('PL', 2023);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        expect.stringContaining('/competitions/PL/standings?season=2023')
      );
    });

    it('should fetch standings without season', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: { standings: [] } });

      await client.getStandings('PL');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/competitions/PL/standings'
      );
    });
  });
});
