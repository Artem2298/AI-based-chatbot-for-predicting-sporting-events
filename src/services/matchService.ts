import { FootballDataClient } from '@/api/football-data/footballApi';
import { Match, MatchWithScore, mapToMatch } from '@/types/match.types';
import { CacheService } from './cacheService';
import { StandingsResponse } from '@/types/standings.types';

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

  async getHeadToHead(
    matchId: number,
    limit: number = 5
  ): Promise<MatchWithScore[]> {
    const cacheKey = `h2h:${matchId}:${limit}`;

    // Проверяем кэш
    const cached = this.cache.get(cacheKey);
    if (cached) {
      console.log('✅ Returning head-to-head from cache');
      return cached;
    }

    console.log('📡 Fetching head-to-head from API');

    try {
      // Получаем историю встреч напрямую от API
      const response = await this.footballApi.getHeadToHead(matchId, limit);

      // Преобразуем в наш формат
      const h2hMatches: MatchWithScore[] = response.matches
        .filter((match) => match.status === 'FINISHED')
        .map((match) => {
          const baseMatch = mapToMatch(match);
          return {
            ...baseMatch,
            score: match.score.fullTime,
          };
        });

      console.log(`✅ Found ${h2hMatches.length} H2H matches`);

      // Сохраняем в кэш на 1 час (история меняется редко)
      this.cache.set(cacheKey, h2hMatches, 3600);

      return h2hMatches;
    } catch (error) {
      console.error('Error fetching head-to-head:', error);
      throw error;
    }
  }

  async getStandings(competitionCode: string): Promise<StandingsResponse> {
    const cacheKey = `standings:${competitionCode}`;

    // Проверяем кэш
    const cached = this.cache.get(cacheKey);
    if (cached) {
      console.log('✅ Returning standings from cache');
      return cached;
    }

    console.log('📡 Fetching standings from API');

    try {
      const standings = await this.footballApi.getStandings(competitionCode);

      // Кэшируем на 1 час (таблица обновляется не так часто)
      this.cache.set(cacheKey, standings, 3600);

      return standings;
    } catch (error) {
      console.error('Error fetching standings:', error);
      throw error;
    }
  }
}
