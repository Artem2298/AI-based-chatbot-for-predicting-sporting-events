import { FootballDataClient } from '@/api/football-data/footballApi';
import { Match, MatchWithScore, mapToMatch } from '@/types/match.types';
import { CacheService } from './cacheService';
import { StandingsResponse } from '@/types/standings.types';
import { FootballDataMatch } from '@/api/football-data/types';
import { db } from './dbService';
import { withDbRetry } from '@/utils/retry';
import { createLogger } from '@/utils/logger';

const log = createLogger('match-service');

/** Competition code → ID mapping for API filtering */
const COMPETITION_IDS: Record<string, number> = {
  PL: 2021,
  BL1: 2002,
  SA: 2019,
  PD: 2014,
  FL1: 2015,
  CL: 2001,
};

export class MatchService {
  constructor(
    private footballApi: FootballDataClient,
    private cache: CacheService
  ) {}

  private async getCached<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl: number = 300,
    dbCheckFn?: () => Promise<T | null>,
    dbSaveFn?: (data: T) => Promise<void>
  ): Promise<T> {
    // 1. Check Memory Cache
    const cached = this.cache.get(key) as T;
    if (cached) {
      log.debug({ key }, 'memory cache hit');
      return cached;
    }

    // 2. Check Database if function provided
    if (dbCheckFn) {
      try {
        const dbData = await withDbRetry(() => dbCheckFn(), `dbCheck:${key}`);
        if (dbData) {
          log.debug({ key }, 'database hit');
          this.cache.set(key, dbData, ttl); // Update memory cache
          return dbData;
        }
      } catch (error) {
        log.warn({ key, err: error }, 'DB check failed, falling through to API');
      }
    }

    // 3. Fetch from API
    log.debug({ key }, 'fetching from API');
    try {
      const data = await fetchFn();

      // Save to Database if function provided (non-blocking)
      if (dbSaveFn) {
        withDbRetry(() => dbSaveFn(data), `dbSave:${key}`).catch((err) => {
          log.warn({ key, err }, 'DB save failed');
        });
      }

      this.cache.set(key, data, ttl);
      return data;
    } catch (error) {
      log.error({ key, err: error }, 'fetch failed');
      throw error;
    }
  }

  private async getRawMatch(matchId: number): Promise<FootballDataMatch> {
    return this.getCached(
      `matchRaw:${matchId}`,
      () => this.footballApi.getMatch(matchId),
      600, // 10 min
      async () => {
        const match = await db.match.findUnique({
          where: { id: matchId },
          include: { homeTeam: true, awayTeam: true }
        });
        if (!match) return null;

        return {
          id: match.id,
          utcDate: match.utcDate.toISOString(),
          status: match.status,
          homeTeam: { id: match.homeTeam.id, name: match.homeTeam.name },
          awayTeam: { id: match.awayTeam.id, name: match.awayTeam.name },
          score: { fullTime: { home: match.scoreHome, away: match.scoreAway } },
          competition: { code: match.competitionCode, name: match.competitionName }
        } as unknown as FootballDataMatch;
      },
      async (data) => {
        await db.$transaction([
          db.team.upsert({
            where: { id: data.homeTeam.id },
            update: { name: data.homeTeam.name },
            create: { id: data.homeTeam.id, name: data.homeTeam.name }
          }),
          db.team.upsert({
            where: { id: data.awayTeam.id },
            update: { name: data.awayTeam.name },
            create: { id: data.awayTeam.id, name: data.awayTeam.name }
          }),
          db.match.upsert({
            where: { id: data.id },
            update: {
              status: data.status,
              scoreHome: data.score.fullTime.home,
              scoreAway: data.score.fullTime.away,
            },
            create: {
              id: data.id,
              utcDate: new Date(data.utcDate),
              status: data.status,
              homeTeamId: data.homeTeam.id,
              awayTeamId: data.awayTeam.id,
              scoreHome: data.score.fullTime.home,
              scoreAway: data.score.fullTime.away,
              competitionCode: data.competition?.code || 'UNKNOWN',
              competitionName: data.competition?.name || 'Unknown'
            }
          }),
        ]);
      }
    );
  }

  async getUpcomingMatches(
    competitionCode: string,
    days: number = 7
  ): Promise<Match[]> {
    // Memory cache check
    const cacheKey = `upcoming:${competitionCode}:${days}`;
    const cached = this.cache.get(cacheKey) as Match[];
    if (cached) {
      log.debug({ key: cacheKey }, 'memory cache hit');
      return cached;
    }

    log.debug({ key: cacheKey }, 'fetching from API');
    const response = await this.footballApi.getUpcomingMatches(competitionCode);

    const now = new Date();
    const endDate = new Date();
    endDate.setDate(now.getDate() + days);

    const filtered = response.matches.filter((match) => {
      const matchDate = new Date(match.utcDate);
      return matchDate >= now && matchDate <= endDate;
    });

    for (const match of filtered) {
      try {
        await withDbRetry(
          () =>
            db.$transaction([
              db.team.upsert({
                where: { id: match.homeTeam.id },
                update: { name: match.homeTeam.name },
                create: { id: match.homeTeam.id, name: match.homeTeam.name },
              }),
              db.team.upsert({
                where: { id: match.awayTeam.id },
                update: { name: match.awayTeam.name },
                create: { id: match.awayTeam.id, name: match.awayTeam.name },
              }),
              db.match.upsert({
                where: { id: match.id },
                update: {
                  status: match.status,
                  scoreHome: match.score.fullTime.home,
                  scoreAway: match.score.fullTime.away,
                },
                create: {
                  id: match.id,
                  utcDate: new Date(match.utcDate),
                  status: match.status,
                  homeTeamId: match.homeTeam.id,
                  awayTeamId: match.awayTeam.id,
                  scoreHome: match.score.fullTime.home,
                  scoreAway: match.score.fullTime.away,
                  competitionCode: match.competition?.code || competitionCode,
                  competitionName: match.competition?.name || 'Unknown',
                },
              }),
            ]),
          `saveMatch(${match.id})`
        );
      } catch (error) {
        log.error({ matchId: match.id, err: error }, 'failed to save match to DB');
      }
    }

    const matches = filtered.map(mapToMatch);
    this.cache.set(cacheKey, matches, 300);
    return matches;
  }

  async getMatchDetails(matchId: number): Promise<MatchWithScore> {
    const response = await this.getRawMatch(matchId);
    const baseMatch = mapToMatch(response);

    return {
      ...baseMatch,
      score: response.score.fullTime,
      homeTeamId: response.homeTeam.id,
      awayTeamId: response.awayTeam.id,
    };
  }

  async getMatchWithDetailedStats(matchId: number): Promise<FootballDataMatch> {
    return this.getRawMatch(matchId);
  }

  async getTeamLastMatches(
    teamId: number,
    limit: number,
    competitionCode?: string
  ): Promise<MatchWithScore[]> {
    const competitionId = competitionCode
      ? COMPETITION_IDS[competitionCode]
      : undefined;
    const cacheKey = `team:${teamId}:matches:${limit}:${competitionCode || 'all'}`;

    return this.getCached(
      cacheKey,
      async () => {
        const response = await this.footballApi.getTeamMatches(
          teamId,
          limit,
          competitionId
        );
        return response.matches.map((match) => ({
          ...mapToMatch(match),
          score: match.score.fullTime,
        }));
      },
      3600
    );
  }

  async getTeamIds(
    matchId: number
  ): Promise<{ homeTeamId: number; awayTeamId: number }> {
    const response = await this.getRawMatch(matchId);
    return {
      homeTeamId: response.homeTeam.id,
      awayTeamId: response.awayTeam.id,
    };
  }

  async getHeadToHead(
    matchId: number,
    limit: number = 5
  ): Promise<MatchWithScore[]> {
    return this.getCached(
      `h2h:${matchId}:${limit}`,
      async () => {
        const response = await this.footballApi.getHeadToHead(matchId, limit);
        const h2hMatches: MatchWithScore[] = response.matches
          .filter((match) => match.status === 'FINISHED')
          .map((match) => {
            const baseMatch = mapToMatch(match);
            return {
              ...baseMatch,
              score: match.score.fullTime,
            };
          });

        log.debug({ matchId, count: h2hMatches.length }, 'H2H matches found');
        return h2hMatches;
      },
      3600
    );
  }

  async getStandings(competitionCode: string): Promise<StandingsResponse> {
    const season = getCurrentSeason();

    return this.getCached(
      `standings:${competitionCode}`,
      () => this.footballApi.getStandings(competitionCode),
      1800, // 30 min
      async () => {
        const standing = await db.standing.findUnique({
          where: {
            competitionCode_season: { competitionCode, season },
          },
        });
        if (!standing) return null;

        // Stale if older than 2 hours
        const ageMs = Date.now() - new Date(standing.updatedAt).getTime();
        if (ageMs > 2 * 60 * 60 * 1000) return null;

        return standing.data as unknown as StandingsResponse;
      },
      async (data) => {
        try {
          await db.standing.upsert({
            where: {
              competitionCode_season: { competitionCode, season },
            },
            update: {
              matchday: data.season?.currentMatchday ?? 0,
              data: JSON.parse(JSON.stringify(data)),
            },
            create: {
              competitionCode,
              season,
              matchday: data.season?.currentMatchday ?? 0,
              data: JSON.parse(JSON.stringify(data)),
            },
          });
          log.info({ competitionCode, season }, 'standings saved to DB');
        } catch (error) {
          log.error({ competitionCode, err: error }, 'failed to save standings to DB');
        }
      }
    );
  }

  async refreshMatchFromApi(matchId: number): Promise<MatchWithScore> {
    const response = await this.footballApi.getMatch(matchId);
    const baseMatch = mapToMatch(response);

    await withDbRetry(
      () =>
        db.$transaction([
          db.team.upsert({
            where: { id: response.homeTeam.id },
            update: { name: response.homeTeam.name },
            create: { id: response.homeTeam.id, name: response.homeTeam.name }
          }),
          db.team.upsert({
            where: { id: response.awayTeam.id },
            update: { name: response.awayTeam.name },
            create: { id: response.awayTeam.id, name: response.awayTeam.name }
          }),
          db.match.upsert({
            where: { id: response.id },
            update: {
              status: response.status,
              scoreHome: response.score.fullTime.home,
              scoreAway: response.score.fullTime.away,
            },
            create: {
              id: response.id,
              utcDate: new Date(response.utcDate),
              status: response.status,
              homeTeamId: response.homeTeam.id,
              awayTeamId: response.awayTeam.id,
              scoreHome: response.score.fullTime.home,
              scoreAway: response.score.fullTime.away,
              competitionCode: response.competition?.code || 'UNKNOWN',
              competitionName: response.competition?.name || 'Unknown'
            }
          }),
        ]),
      `refreshMatch(${matchId})`
    );

    this.cache.set(`matchRaw:${matchId}`, response, 600);

    return {
      ...baseMatch,
      score: response.score.fullTime,
      homeTeamId: response.homeTeam.id,
      awayTeamId: response.awayTeam.id,
    };
  }

  clearStandingsCache(competitionCode: string): void {
    this.cache.delete(`standings:${competitionCode}`);
  }

  clearMatchCache(matchId: number): void {
    this.cache.delete(`matchRaw:${matchId}`);
  }
}

function getCurrentSeason(): number {
  const now = new Date();
  return now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
}
