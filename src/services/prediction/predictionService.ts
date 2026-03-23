import { db } from '../dbService';
import { GeminiClient } from '@/api/ai/geminiClient';
import { MatchService } from '../matchService';
import { MatchWithScore } from '@/types/match.types';
import {
  PredictionData,
  DetailedMatchStats,
  MatchOutcomePrediction,
  PredictionType,
  Prediction,
  TotalGoalsPrediction,
  BttsPrediction,
} from '@/types/prediction.types';
import { createLogger } from '@/utils/logger';
import { StatsCalculator } from './statsCalculator';
import { PromptBuilder } from './promptBuilder';
import { PredictionValidator, RawAIPrediction } from './predictionValidator';

const log = createLogger('prediction');

export class PredictionService {
  private readonly stats: StatsCalculator;
  private readonly prompts: PromptBuilder;
  private readonly validator: PredictionValidator;

  private static readonly PREDICTION_TTL = 6 * 60 * 60 * 1000; // 6h
  private static readonly API_RATE_LIMIT_DELAY = 1500; // 1.5s between API calls

  constructor(
    private matchService: MatchService,
    private geminiClient: GeminiClient
  ) {
    this.stats = new StatsCalculator();
    this.prompts = new PromptBuilder(this.stats);
    this.validator = new PredictionValidator();
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
      {
        matchId,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        homeTeamId: match.homeTeamId,
        awayTeamId: match.awayTeamId,
        competition: match.competitionCode,
      },
      'collecting match data'
    );

    const homeMatches = await this.matchService.getTeamLastMatches(
      match.homeTeamId,
      15,
      match.competitionCode
    );
    const awayMatches = await this.matchService.getTeamLastMatches(
      match.awayTeamId,
      15,
      match.competitionCode
    );

    log.info(
      {
        matchId,
        homeMatchCount: homeMatches.length,
        awayMatchCount: awayMatches.length,
      },
      'team matches fetched'
    );

    // Fetch standings for team positions
    let homePosition: number | undefined;
    let homePoints: number | undefined;
    let awayPosition: number | undefined;
    let awayPoints: number | undefined;
    try {
      const standings = await this.matchService.getStandings(
        match.competitionCode
      );
      const table = standings.standings?.[0]?.table;
      if (table) {
        const homeEntry = table.find((e) => e.team.name === match.homeTeam);
        const awayEntry = table.find((e) => e.team.name === match.awayTeam);
        if (homeEntry) {
          homePosition = homeEntry.position;
          homePoints = homeEntry.points;
        }
        if (awayEntry) {
          awayPosition = awayEntry.position;
          awayPoints = awayEntry.points;
        }
      }
    } catch (error) {
      log.warn(
        { matchId, err: error },
        'failed to fetch standings for prediction'
      );
    }

    const homeTeamData = {
      name: match.homeTeam,
      lastMatches: await this.enrichMatchesWithStats(
        homeMatches,
        match.homeTeam,
        fetchDetails
      ),
      position: homePosition,
      points: homePoints,
    };

    const awayTeamData = {
      name: match.awayTeam,
      lastMatches: await this.enrichMatchesWithStats(
        awayMatches,
        match.awayTeam,
        fetchDetails
      ),
      position: awayPosition,
      points: awayPoints,
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

      enrichedMatches.push(baseStats);
    }

    return enrichedMatches.reverse();
  }

  private async generateOutcomePrediction(
    matchId: number,
    lang?: string,
    userId?: number
  ): Promise<MatchOutcomePrediction> {
    return this.generatePredictionBase(
      matchId,
      'outcome',
      'OUTCOME',
      () => null,
      async (data) =>
        await this.prompts.buildOutcomePredictionPrompt(data, lang),
      (pred) => this.validator.validateAndNormalizeOutcomePrediction(pred),
      userId,
      lang
    );
  }

  private async generateTotalPrediction(
    matchId: number,
    lang?: string,
    userId?: number
  ): Promise<TotalGoalsPrediction> {
    return this.generatePredictionBase(
      matchId,
      'total',
      'TOTAL',
      (data) => {
        const home = this.stats.calculateGoalsStats(data.homeTeam.lastMatches);
        const away = this.stats.calculateGoalsStats(data.awayTeam.lastMatches);
        return { home, away };
      },
      async (data) => await this.prompts.buildTotalPredictionPrompt(data, lang),
      (pred) => this.validator.validateTotalPrediction(pred),
      userId,
      lang
    );
  }

  private async generateBttsPrediction(
    matchId: number,
    lang?: string,
    userId?: number
  ): Promise<BttsPrediction> {
    return this.generatePredictionBase(
      matchId,
      'btts',
      'BTTS',
      (data) => {
        const home = this.stats.calculateGoalsStats(data.homeTeam.lastMatches);
        const away = this.stats.calculateGoalsStats(data.awayTeam.lastMatches);
        return { home, away };
      },
      async (data) => await this.prompts.buildBttsPredictionPrompt(data, lang),
      (pred) => this.validator.validateBttsPrediction(pred),
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
        log.warn(
          { matchId, type, err: dbError },
          'failed to save global prediction cache'
        );
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
      log.warn(
        { userId, predictionId, err: error },
        'failed to track user view'
      );
    }
  }
}
