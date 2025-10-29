import { FootballDataClient } from '@/api/football-data/footballApi';
import { Match, MatchWithScore, mapToMatch } from '@/types/match.types';
import { CacheService } from './cacheService';

export class MatchService {
  constructor(
    private footballApi: FootballDataClient,
    private cache: CacheService
  ) {}

  async getUpcomingMatches(
    competitionCode: string,
    days: number = 7
  ): Promise<Match[]> {
    const cacheKey = `matches${competitionCode}:${days}`;
    const cashed = this.cache.get(cacheKey);
    if (cashed) {
      console.log('Return from cache');
      return cashed;
    }

    const respons = await this.footballApi.getUpcomingMatches(competitionCode);

    const now = new Date();
    const endDate = new Date();
    endDate.setDate(now.getDate() + days);

    const result = respons.matches
      .filter((match) => {
        const matchDate = new Date(match.utcDate);
        return matchDate >= now && matchDate <= endDate;
      })
      .map(mapToMatch);

    this.cache.set(cacheKey, result, 300);

    return result;
  }

  async getMatchDetails(matchId: number): Promise<MatchWithScore> {
    const cacheKey = `matchDetails:${matchId}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      console.log('Return from cache');
      return cached;
    }
    const respons = await this.footballApi.getMatch(matchId);

    const baseMatch = mapToMatch(respons);

    const result = { ...baseMatch, score: respons.score.fullTime };

    this.cache.set(cacheKey, result, 600);

    return result;
  }

  async getTeamLastMatches(
    teamId: number,
    limit: number
  ): Promise<MatchWithScore[]> {
    const cacheKey = `team:${teamId}:matches:${limit}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      console.log('Return from cache');
      return cached;
    }

    const response = await this.footballApi.getTeamMatches(teamId, limit);

    const result = response.matches.map((match) => ({
      ...mapToMatch(match),
      score: match.score.fullTime,
    }));

    this.cache.set(cacheKey, result, 3600);

    return result;
  }

  async getTeamIds(
    matchId: number
  ): Promise<{ homeTeamId: number; awayTeamId: number }> {
    const response = await this.footballApi.getMatch(matchId);
    return {
      homeTeamId: response.homeTeam.id,
      awayTeamId: response.awayTeam.id,
    };
  }
}
