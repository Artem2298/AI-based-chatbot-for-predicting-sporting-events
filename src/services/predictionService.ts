import { db } from './dbService';
import { GeminiClient } from '@/api/ai/geminiClient';
import { loadPrompt } from '@/utils/promptLoader';
import { MatchService } from './matchService';
import { MatchWithScore } from '@/types/match.types';
import {
  PredictionData,
  DetailedMatchStats,
  MatchOutcomePrediction,
  CornersPrediction,
  PredictionType,
  Prediction,
  OffsidesPrediction,
  CardsPrediction,
  TotalGoalsPrediction,
  BttsPrediction,
} from '@/types/prediction.types';
import { createLogger } from '@/utils/logger';

const log = createLogger('prediction');

interface SimpleStats {
  total: number;
  average: number;
  matches: number;
}

interface CardsStats {
  totalYellow: number;
  totalRed: number;
  totalCards: number;
  avgYellow: number;
  avgRed: number;
  avgTotal: number;
  matches: number;
}

/** Raw AI response before validation */
type RawAIPrediction = Record<string, number | string | undefined>;

export class PredictionService {
  constructor(
    private matchService: MatchService,
    private geminiClient: GeminiClient
  ) {}

  private static readonly PREDICTION_TTL = 6 * 60 * 60 * 1000; // 6h
  private static readonly API_RATE_LIMIT_DELAY = 1500; // 1.5s between API calls

  private getLanguageName(lang?: string): string {
    const languages: Record<string, string> = {
      ru: 'Russian',
      uk: 'Ukrainian',
      en: 'English',
      cs: 'Czech',
      sk: 'Slovak',
      pl: 'Polish',
    };
    return languages[lang || 'en'] || 'English';
  }

  async generatePrediction(
    matchId: number,
    type: PredictionType,
    lang?: string,
    userId?: number
  ): Promise<Prediction> {
    switch (type) {
      case 'outcome':
        return this.generateOutcomePrediction(matchId, lang, userId);
      case 'corners':
        return this.generateCornersPrediction(matchId, lang, userId);
      case 'cards':
        return this.generateCardsPrediction(matchId, lang, userId);
      case 'offsides':
        return this.generateOffsidesPrediction(matchId, lang, userId);
      case 'total':
        return this.generateTotalPrediction(matchId, lang, userId);
      case 'btts':
        return this.generateBttsPrediction(matchId, lang, userId);
      default:
        throw new Error(`Unknown prediction type: ${type}`);
    }
  }

  private async collectMatchData(
    matchId: number,
    fetchDetails: boolean = false
  ): Promise<PredictionData> {
    const match = await this.matchService.getMatchDetails(matchId);

    log.debug(
      { matchId, homeTeam: match.homeTeam, awayTeam: match.awayTeam, homeTeamId: match.homeTeamId, awayTeamId: match.awayTeamId, competition: match.competitionCode },
      'collecting match data'
    );

    const homeMatches = await this.matchService.getTeamLastMatches(
      match.homeTeamId,
      3,
      match.competitionCode
    );
    const awayMatches = await this.matchService.getTeamLastMatches(
      match.awayTeamId,
      3,
      match.competitionCode
    );

    log.debug(
      { matchId, homeMatchCount: homeMatches.length, awayMatchCount: awayMatches.length },
      'team matches fetched'
    );

    const homeTeamData = {
      name: match.homeTeam,
      lastMatches: await this.enrichMatchesWithStats(
        homeMatches,
        match.homeTeam,
        fetchDetails
      ),
      position: undefined,
      points: undefined,
    };

    const awayTeamData = {
      name: match.awayTeam,
      lastMatches: await this.enrichMatchesWithStats(
        awayMatches,
        match.awayTeam,
        fetchDetails
      ),
      position: undefined,
      points: undefined,
    };

    log.debug({ matchId }, 'detailed statistics collected');

    return {
      matchId: match.id,
      homeTeam: homeTeamData,
      awayTeam: awayTeamData,
    };
  }

  private async enrichMatchesWithStats(
    matches: MatchWithScore[],
    teamName: string,
    fetchDetails: boolean
  ): Promise<DetailedMatchStats[]> {
    const enrichedMatches: DetailedMatchStats[] = [];

    for (const match of matches) {
      const isHome = match.homeTeam === teamName;
      const goalsScored = (isHome ? match.score.home : match.score.away) ?? 0;
      const goalsConceded = (isHome ? match.score.away : match.score.home) ?? 0;

      let result: 'W' | 'D' | 'L';
      if (goalsScored > goalsConceded) result = 'W';
      else if (goalsScored === goalsConceded) result = 'D';
      else result = 'L';

      const baseStats: DetailedMatchStats = {
        result,
        goalsScored: goalsScored || 0,
        goalsConceded: goalsConceded || 0,
        opponent: isHome ? match.awayTeam : match.homeTeam,
        wasHome: isHome,
      };

      if (fetchDetails) {
        if (matches.indexOf(match) > 0)
          await new Promise((r) =>
            setTimeout(r, PredictionService.API_RATE_LIMIT_DELAY)
          );

        try {
          const fullMatch = await this.matchService.getMatchWithDetailedStats(
            match.id
          );

          if (fullMatch.homeTeam && fullMatch.awayTeam) {
            const teamStats = isHome
              ? fullMatch.homeTeam.statistics
              : fullMatch.awayTeam.statistics;

            if (teamStats) {
              baseStats.corners = teamStats.corner_kicks ?? undefined;
              baseStats.yellowCards = teamStats.yellow_cards ?? undefined;
              baseStats.redCards = teamStats.red_cards ?? undefined;
              baseStats.offsides = teamStats.offsides ?? undefined;
              baseStats.shotsOnTarget = teamStats.shots_on_goal ?? undefined;
              baseStats.shotsOffTarget = teamStats.shots_off_goal ?? undefined;
              baseStats.possession = teamStats.ball_possession ?? undefined;
            }
          }
        } catch {
          log.warn({ matchId: match.id }, 'could not fetch detailed stats for match');
        }
      }

      enrichedMatches.push(baseStats);
    }

    return enrichedMatches.reverse();
  }

  private calculateGeneralStats(matches: DetailedMatchStats[]) {
    const wins = matches.filter((m) => m.result === 'W').length;
    const draws = matches.filter((m) => m.result === 'D').length;
    const losses = matches.filter((m) => m.result === 'L').length;

    const goalsFor = matches.reduce((sum, m) => sum + m.goalsScored, 0);
    const goalsAgainst = matches.reduce((sum, m) => sum + m.goalsConceded, 0);

    return {
      wins,
      draws,
      losses,
      goalsFor,
      goalsAgainst,
      goalDifference: goalsFor - goalsAgainst,
      avgGoalsFor: (goalsFor / matches.length).toFixed(2),
      avgGoalsAgainst: (goalsAgainst / matches.length).toFixed(2),
    };
  }

  private calculateSimpleStats(
    matches: DetailedMatchStats[],
    field: 'corners' | 'offsides' | 'yellowCards' | 'redCards'
  ): { total: number; average: number; matches: number } | null {
    const matchesWithField = matches.filter((m) => m[field] !== undefined);

    if (matchesWithField.length === 0) {
      return null;
    }

    const total = matchesWithField.reduce(
      (sum, m) => sum + ((m[field] as number) || 0),
      0
    );

    return {
      total,
      average: parseFloat((total / matchesWithField.length).toFixed(2)),
      matches: matchesWithField.length,
    };
  }

  private calculateCornersStats(matches: DetailedMatchStats[]) {
    return this.calculateSimpleStats(matches, 'corners');
  }

  private calculateOffsidesStats(matches: DetailedMatchStats[]) {
    return this.calculateSimpleStats(matches, 'offsides');
  }

  private calculateGoalsStats(matches: DetailedMatchStats[]) {
    if (matches.length === 0) return null;

    const general = this.calculateGeneralStats(matches);
    const totalGoals = matches.map((m) => m.goalsScored + m.goalsConceded);
    const over2_5 = totalGoals.filter((g) => g > 2.5).length;
    const btts = matches.filter(
      (m) => m.goalsScored > 0 && m.goalsConceded > 0
    ).length;

    return {
      averageTotal: (
        totalGoals.reduce((a, b) => a + b, 0) / matches.length
      ).toFixed(2),
      over2_5_percentage: Math.round((over2_5 / matches.length) * 100),
      btts_percentage: Math.round((btts / matches.length) * 100),
      goalsScoredAvg: general.avgGoalsFor,
      goalsConcededAvg: general.avgGoalsAgainst,
      matches: matches.length,
      recentMatches: matches.map((m) => ({
        result: m.result,
        score: `${m.goalsScored}-${m.goalsConceded}`,
        total: m.goalsScored + m.goalsConceded,
        opponent: m.opponent,
      })),
    };
  }

  private calculateCardsStats(matches: DetailedMatchStats[]) {
    const yellowStats = this.calculateSimpleStats(matches, 'yellowCards');
    const redStats = this.calculateSimpleStats(matches, 'redCards');

    if (!yellowStats || !redStats) {
      return null;
    }

    return {
      totalYellow: yellowStats.total,
      totalRed: redStats.total,
      totalCards: yellowStats.total + redStats.total,
      avgYellow: yellowStats.average,
      avgRed: redStats.average,
      avgTotal: parseFloat((yellowStats.average + redStats.average).toFixed(2)),
      matches: yellowStats.matches,
    };
  }

  async generateOutcomePrediction(
    matchId: number,
    lang?: string,
    userId?: number
  ): Promise<MatchOutcomePrediction> {
    return this.generatePredictionBase(
      matchId,
      'outcome',
      'OUTCOME',
      () => null,
      async (data) => await this.buildOutcomePredictionPrompt(data, lang),
      (pred) => this.validateAndNormalizeOutcomePrediction(pred),
      userId,
      lang
    );
  }

  async generateCornersPrediction(
    matchId: number,
    lang?: string,
    userId?: number
  ): Promise<CornersPrediction> {
    return this.generatePredictionBase(
      matchId,
      'corners',
      'CORNERS',
      (data) => {
        const home = this.calculateCornersStats(data.homeTeam.lastMatches);
        const away = this.calculateCornersStats(data.awayTeam.lastMatches);
        if (!home || !away) {
          throw new Error('Insufficient corners statistics for prediction');
        }
        return { home, away };
      },
      async (data, stats) =>
        await this.buildCornersPredictionPrompt(
          data,
          stats.home,
          stats.away,
          lang
        ),
      (pred) => this.validateCornersPrediction(pred),
      userId,
      lang
    );
  }

  async generateCardsPrediction(
    matchId: number,
    lang?: string,
    userId?: number
  ): Promise<CardsPrediction> {
    return this.generatePredictionBase(
      matchId,
      'cards',
      'CARDS',
      (data) => {
        const home = this.calculateCardsStats(data.homeTeam.lastMatches);
        const away = this.calculateCardsStats(data.awayTeam.lastMatches);
        if (!home || !away) {
          throw new Error('Insufficient cards statistics for prediction');
        }
        return { home, away };
      },
      async (data, stats) =>
        await this.buildCardsPredictionPrompt(
          data,
          stats.home,
          stats.away,
          lang
        ),
      (pred) => this.validateCardsPrediction(pred),
      userId,
      lang
    );
  }

  async generateOffsidesPrediction(
    matchId: number,
    lang?: string,
    userId?: number
  ): Promise<OffsidesPrediction> {
    return this.generatePredictionBase(
      matchId,
      'offsides',
      'OFFSIDES',
      (data) => {
        const home = this.calculateOffsidesStats(data.homeTeam.lastMatches);
        const away = this.calculateOffsidesStats(data.awayTeam.lastMatches);
        if (!home || !away) {
          throw new Error('Insufficient offsides statistics for prediction');
        }
        return { home, away };
      },
      async (data, stats) =>
        await this.buildOffsidesPredictionPrompt(
          data,
          stats.home,
          stats.away,
          lang
        ),
      (pred) => this.validateOffsidesPrediction(pred),
      userId,
      lang
    );
  }

  async generateTotalPrediction(
    matchId: number,
    lang?: string,
    userId?: number
  ): Promise<TotalGoalsPrediction> {
    return this.generatePredictionBase(
      matchId,
      'total',
      'TOTAL',
      (data) => {
        const home = this.calculateGoalsStats(data.homeTeam.lastMatches);
        const away = this.calculateGoalsStats(data.awayTeam.lastMatches);
        return { home, away };
      },
      async (data) => await this.buildTotalPredictionPrompt(data, lang),
      (pred) => this.validateTotalPrediction(pred),
      userId,
      lang
    );
  }

  async generateBttsPrediction(
    matchId: number,
    lang?: string,
    userId?: number
  ): Promise<BttsPrediction> {
    return this.generatePredictionBase(
      matchId,
      'btts',
      'BTTS',
      (data) => {
        const home = this.calculateGoalsStats(data.homeTeam.lastMatches);
        const away = this.calculateGoalsStats(data.awayTeam.lastMatches);
        return { home, away };
      },
      async (data) => await this.buildBttsPredictionPrompt(data, lang),
      (pred) => this.validateBttsPrediction(pred),
      userId,
      lang
    );
  }

  private async generatePredictionBase<T extends Prediction, S>(
    matchId: number,
    type: PredictionType,
    logLabel: string,
    statsCalculator: (data: PredictionData) => S,
    promptBuilder: (data: PredictionData, stats: S) => Promise<string>,
    validator: (prediction: RawAIPrediction) => void,
    userId?: number,
    lang: string = 'en'
  ): Promise<T> {
    try {
      const locale = lang || 'en';

      // 1. Check for cached prediction
      const cached = await db.prediction.findUnique({
        where: {
          matchId_type_locale: {
            matchId,
            type,
            locale,
          },
        },
      });

      if (cached) {
        const isFresh =
          Date.now() - new Date(cached.updatedAt).getTime() <
          PredictionService.PREDICTION_TTL;

        if (isFresh) {
          // Track user view
          if (userId) {
            await this.trackUserView(userId, cached.id);
          }

          return {
            ...(cached.content as Record<string, unknown>),
            type,
          } as T;
        }
      }

      const data = await this.collectMatchData(
        matchId,
        type !== 'outcome' && type !== 'total' && type !== 'btts'
      );

      const stats = statsCalculator(data);
      const prompt = await promptBuilder(data, stats);

      log.trace({ type: logLabel, prompt }, 'AI prompt generated');

      const prediction = (await this.geminiClient.generateJSON(
        prompt
      )) as RawAIPrediction;

      log.trace({ type: logLabel, prediction }, 'AI response received');

      validator(prediction);

      let savedPrediction;
      try {
        savedPrediction = await db.prediction.upsert({
          where: {
            matchId_type_locale: {
              matchId,
              type,
              locale,
            },
          },
          update: {
            content: JSON.parse(JSON.stringify(prediction)),
          },
          create: {
            matchId,
            type,
            locale,
            content: JSON.parse(JSON.stringify(prediction)),
          },
        });
        log.debug({ matchId, type }, 'global cache updated');
      } catch (dbError) {
        log.warn({ matchId, type, err: dbError }, 'failed to save global prediction cache');
      }

      if (userId && savedPrediction) {
        await this.trackUserView(userId, savedPrediction.id);
      }

      log.info({ matchId, type: logLabel }, 'prediction generated');

      return {
        ...prediction,
        type,
      } as T;
    } catch (error) {
      log.error(
        { matchId, type: logLabel, err: error },
        'failed to generate prediction'
      );
      throw error;
    }
  }

  private async trackUserView(userId: number, predictionId: number) {
    try {
      await db.userPrediction.upsert({
        where: {
          userId_predictionId: { userId, predictionId },
        },
        update: {
          viewCount: { increment: 1 },
        },
        create: {
          userId,
          predictionId,
        },
      });
      log.debug({ userId, predictionId }, 'user view tracked');
    } catch (error) {
      log.warn({ userId, predictionId, err: error }, 'failed to track user view');
    }
  }

  private async buildOutcomePredictionPrompt(
    data: PredictionData,
    lang?: string
  ): Promise<string> {
    const { homeTeam, awayTeam } = data;

    const homeStats = this.calculateGeneralStats(homeTeam.lastMatches);
    const awayStats = this.calculateGeneralStats(awayTeam.lastMatches);

    const analysisData = {
      match: {
        homeTeam: homeTeam.name,
        awayTeam: awayTeam.name,
        venue: 'home',
      },
      homeTeamStats: {
        name: homeTeam.name,
        recentForm: homeTeam.lastMatches.map((m) => m.result).join('-'),
        lastMatches: homeTeam.lastMatches,
        summary: {
          wins: homeStats.wins,
          draws: homeStats.draws,
          losses: homeStats.losses,
          goalsScored: homeStats.goalsFor,
          goalsConceded: homeStats.goalsAgainst,
          goalDifference: homeStats.goalDifference,
          avgGoalsScored: parseFloat(homeStats.avgGoalsFor),
          avgGoalsConceded: parseFloat(homeStats.avgGoalsAgainst),
        },
      },
      awayTeamStats: {
        name: awayTeam.name,
        recentForm: awayTeam.lastMatches.map((m) => m.result).join('-'),
        lastMatches: awayTeam.lastMatches,
        summary: {
          wins: awayStats.wins,
          draws: awayStats.draws,
          losses: awayStats.losses,
          goalsScored: awayStats.goalsFor,
          goalsConceded: awayStats.goalsAgainst,
          goalDifference: awayStats.goalDifference,
          avgGoalsScored: parseFloat(awayStats.avgGoalsFor),
          avgGoalsConceded: parseFloat(awayStats.avgGoalsAgainst),
        },
      },
    };

    return await loadPrompt('outcome', {
      MATCH_DATA: JSON.stringify(analysisData, null, 2),
      HOME_TEAM: homeTeam.name,
      LANGUAGE: this.getLanguageName(lang),
    });
  }

  private async buildCornersPredictionPrompt(
    data: PredictionData,
    homeCorners: SimpleStats,
    awayCorners: SimpleStats,
    lang?: string
  ): Promise<string> {
    const { homeTeam, awayTeam } = data;

    const analysisData = {
      match: {
        homeTeam: homeTeam.name,
        awayTeam: awayTeam.name,
        venue: 'home',
      },
      homeTeamCorners: {
        name: homeTeam.name,
        lastMatches: homeTeam.lastMatches.map((m) => ({
          opponent: m.opponent,
          wasHome: m.wasHome,
          corners: m.corners,
          result: m.result,
        })),
        statistics: {
          totalCorners: homeCorners.total,
          averageCorners: homeCorners.average,
          matchesAnalyzed: homeCorners.matches,
        },
      },
      awayTeamCorners: {
        name: awayTeam.name,
        lastMatches: awayTeam.lastMatches.map((m) => ({
          opponent: m.opponent,
          wasHome: m.wasHome,
          corners: m.corners,
          result: m.result,
        })),
        statistics: {
          totalCorners: awayCorners.total,
          averageCorners: awayCorners.average,
          matchesAnalyzed: awayCorners.matches,
        },
      },
    };

    return await loadPrompt('corners', {
      MATCH_DATA: JSON.stringify(analysisData, null, 2),
      LANGUAGE: this.getLanguageName(lang),
    });
  }

  private async buildCardsPredictionPrompt(
    data: PredictionData,
    homeCards: CardsStats,
    awayCards: CardsStats,
    lang?: string
  ): Promise<string> {
    const { homeTeam, awayTeam } = data;

    const analysisData = {
      match: {
        homeTeam: homeTeam.name,
        awayTeam: awayTeam.name,
        venue: 'home',
      },
      homeTeamCards: {
        name: homeTeam.name,
        lastMatches: homeTeam.lastMatches.map((m) => ({
          opponent: m.opponent,
          wasHome: m.wasHome,
          yellowCards: m.yellowCards,
          redCards: m.redCards,
          result: m.result,
        })),
        statistics: {
          totalYellow: homeCards.totalYellow,
          totalRed: homeCards.totalRed,
          totalCards: homeCards.totalCards,
          avgYellow: homeCards.avgYellow,
          avgRed: homeCards.avgRed,
          avgTotal: homeCards.avgTotal,
          matchesAnalyzed: homeCards.matches,
        },
      },
      awayTeamCards: {
        name: awayTeam.name,
        lastMatches: awayTeam.lastMatches.map((m) => ({
          opponent: m.opponent,
          wasHome: m.wasHome,
          yellowCards: m.yellowCards,
          redCards: m.redCards,
          result: m.result,
        })),
        statistics: {
          totalYellow: awayCards.totalYellow,
          totalRed: awayCards.totalRed,
          totalCards: awayCards.totalCards,
          avgYellow: awayCards.avgYellow,
          avgRed: awayCards.avgRed,
          avgTotal: awayCards.avgTotal,
          matchesAnalyzed: awayCards.matches,
        },
      },
    };

    return await loadPrompt('cards', {
      MATCH_DATA: JSON.stringify(analysisData, null, 2),
      LANGUAGE: this.getLanguageName(lang),
    });
  }

  private async buildOffsidesPredictionPrompt(
    data: PredictionData,
    homeOffsides: SimpleStats,
    awayOffsides: SimpleStats,
    lang?: string
  ): Promise<string> {
    const { homeTeam, awayTeam } = data;

    const analysisData = {
      match: {
        homeTeam: homeTeam.name,
        awayTeam: awayTeam.name,
        venue: 'home',
      },
      homeTeamOffsides: {
        name: homeTeam.name,
        lastMatches: homeTeam.lastMatches.map((m) => ({
          opponent: m.opponent,
          wasHome: m.wasHome,
          offsides: m.offsides,
          result: m.result,
        })),
        statistics: {
          totalOffsides: homeOffsides.total,
          averageOffsides: homeOffsides.average,
          matchesAnalyzed: homeOffsides.matches,
        },
      },
      awayTeamOffsides: {
        name: awayTeam.name,
        lastMatches: awayTeam.lastMatches.map((m) => ({
          opponent: m.opponent,
          wasHome: m.wasHome,
          offsides: m.offsides,
          result: m.result,
        })),
        statistics: {
          totalOffsides: awayOffsides.total,
          averageOffsides: awayOffsides.average,
          matchesAnalyzed: awayOffsides.matches,
        },
      },
    };

    return await loadPrompt('offsides', {
      MATCH_DATA: JSON.stringify(analysisData, null, 2),
      LANGUAGE: this.getLanguageName(lang),
    });
  }

  private async buildTotalPredictionPrompt(
    data: PredictionData,
    lang?: string
  ): Promise<string> {
    const { homeTeam, awayTeam } = data;
    const homeStats = this.calculateGoalsStats(homeTeam.lastMatches);
    const awayStats = this.calculateGoalsStats(awayTeam.lastMatches);

    const analysisData = {
      match: {
        homeTeam: homeTeam.name,
        awayTeam: awayTeam.name,
        venue: 'home',
      },
      homeTeamGoals: {
        name: homeTeam.name,
        stats: homeStats,
      },
      awayTeamGoals: {
        name: awayTeam.name,
        stats: awayStats,
      },
    };

    return await loadPrompt('total', {
      MATCH_DATA: JSON.stringify(analysisData, null, 2),
      HOME_TEAM: homeTeam.name,
      AWAY_TEAM: awayTeam.name,
      LANGUAGE: this.getLanguageName(lang),
    });
  }

  private async buildBttsPredictionPrompt(
    data: PredictionData,
    lang?: string
  ): Promise<string> {
    const { homeTeam, awayTeam } = data;
    const homeStats = this.calculateGoalsStats(homeTeam.lastMatches);
    const awayStats = this.calculateGoalsStats(awayTeam.lastMatches);

    const analysisData = {
      match: {
        homeTeam: homeTeam.name,
        awayTeam: awayTeam.name,
        venue: 'home',
      },
      homeTeamGoals: {
        name: homeTeam.name,
        stats: homeStats,
      },
      awayTeamGoals: {
        name: awayTeam.name,
        stats: awayStats,
      },
    };

    return await loadPrompt('btts', {
      MATCH_DATA: JSON.stringify(analysisData, null, 2),
      HOME_TEAM: homeTeam.name,
      AWAY_TEAM: awayTeam.name,
      LANGUAGE: this.getLanguageName(lang),
    });
  }

  private validateAndNormalizeOutcomePrediction(
    prediction: RawAIPrediction
  ): void {
    if (!prediction.homeWin || !prediction.draw || !prediction.awayWin) {
      throw new Error('Invalid outcome prediction format from AI');
    }

    const homeWin = Number(prediction.homeWin);
    const draw = Number(prediction.draw);
    const awayWin = Number(prediction.awayWin);

    const sum = homeWin + draw + awayWin;
    if (Math.abs(sum - 100) > 1) {
      log.warn(
        { sum, homeWin, draw, awayWin },
        'probabilities sum deviates from 100, normalizing'
      );

      const factor = 100 / sum;
      prediction.homeWin = Math.round(homeWin * factor);
      prediction.draw = Math.round(draw * factor);
      prediction.awayWin =
        100 - (prediction.homeWin as number) - (prediction.draw as number);
    }
  }

  private validateCornersPrediction(prediction: RawAIPrediction): void {
    if (!prediction.totalOver9_5 || !prediction.totalUnder9_5) {
      throw new Error('Invalid corners prediction format from AI');
    }

    if (
      !prediction.expectedTotal ||
      !prediction.expectedHome ||
      !prediction.expectedAway
    ) {
      throw new Error('Missing expected values in corners prediction');
    }
  }

  private validateCardsPrediction(prediction: RawAIPrediction): void {
    if (!prediction.totalOver3_5 || !prediction.totalUnder3_5) {
      throw new Error('Invalid cards prediction format from AI');
    }

    if (!prediction.expectedTotal || prediction.expectedYellow === undefined) {
      throw new Error('Missing expected values in cards prediction');
    }
  }

  private validateOffsidesPrediction(prediction: RawAIPrediction): void {
    if (!prediction.totalOver3_5 || !prediction.totalUnder3_5) {
      throw new Error('Invalid offsides prediction format from AI');
    }

    if (
      !prediction.expectedTotal ||
      !prediction.expectedHome ||
      !prediction.expectedAway
    ) {
      throw new Error('Missing expected values in offsides prediction');
    }
  }

  private validateTotalPrediction(prediction: RawAIPrediction): void {
    if (
      prediction.totalOver2_5 === undefined ||
      prediction.totalUnder2_5 === undefined ||
      prediction.expectedTotalGoals === undefined ||
      prediction.expectedHomeGoals === undefined ||
      prediction.expectedAwayGoals === undefined
    ) {
      throw new Error('Invalid total goals prediction format from AI');
    }
  }

  private validateBttsPrediction(prediction: RawAIPrediction): void {
    if (
      prediction.bothTeamsToScoreYes === undefined ||
      prediction.bothTeamsToScoreNo === undefined ||
      prediction.expectedHomeGoals === undefined ||
      prediction.expectedAwayGoals === undefined
    ) {
      throw new Error('Invalid BTTS prediction format from AI');
    }
  }
}
