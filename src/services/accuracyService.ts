import { db } from './dbService';
import { createLogger } from '@/utils/logger';

const log = createLogger('accuracy');

export class AccuracyService {
  async evaluateMatch(
    matchId: number,
    actualScoreHome: number,
    actualScoreAway: number
  ): Promise<void> {
    const predictions = await db.prediction.findMany({
      where: { matchId },
      include: { accuracy: true },
    });

    if (predictions.length === 0) {
      log.info({ matchId }, 'no predictions found for match');
      return;
    }

    const actualTotalGoals = actualScoreHome + actualScoreAway;

    // Types that can't be auto-evaluated (API doesn't provide this data)
    const SKIP_TYPES = new Set(['corners', 'cards', 'offsides']);

    for (const prediction of predictions) {
      if (prediction.accuracy) continue;
      if (SKIP_TYPES.has(prediction.type)) continue;

      const content = prediction.content as Record<string, unknown>;

      let outcomeCorrect: boolean | null = null;
      let goalsOverUnderCorrect: boolean | null = null;
      let bttsCorrect: boolean | null = null;

      if (prediction.type === 'outcome') {
        outcomeCorrect = this.evaluateOutcome(content, actualScoreHome, actualScoreAway);
      }

      if (prediction.type === 'total') {
        goalsOverUnderCorrect = this.evaluateGoalsOverUnder(content, actualTotalGoals);
      }

      if (prediction.type === 'btts') {
        bttsCorrect = this.evaluateBtts(content, actualScoreHome, actualScoreAway);
      }

      // Backward compat: old 'goals' records have both fields
      if (prediction.type === 'goals') {
        goalsOverUnderCorrect = this.evaluateGoalsOverUnder(content, actualTotalGoals);
        bttsCorrect = this.evaluateBtts(content, actualScoreHome, actualScoreAway);
      }

      try {
        await db.predictionAccuracy.create({
          data: {
            predictionId: prediction.id,
            matchId,
            actualScoreHome,
            actualScoreAway,
            actualTotalGoals,
            outcomeCorrect,
            goalsOverUnderCorrect,
            bttsCorrect,
          },
        });
        log.info({ predictionId: prediction.id, type: prediction.type }, 'accuracy evaluated');
      } catch (error) {
        log.warn({ predictionId: prediction.id, err: error }, 'failed to save accuracy');
      }
    }
  }

  private evaluateOutcome(
    content: Record<string, unknown>,
    scoreHome: number,
    scoreAway: number
  ): boolean {
    const recommendation = content.recommendation as string | undefined;
    if (!recommendation) return false;

    let actualResult: string;
    if (scoreHome > scoreAway) actualResult = '1';
    else if (scoreHome === scoreAway) actualResult = 'X';
    else actualResult = '2';

    return recommendation === actualResult;
  }

  private evaluateGoalsOverUnder(
    content: Record<string, unknown>,
    actualTotalGoals: number
  ): boolean {
    const overProb = Number(content.totalOver2_5 ?? 0);
    const underProb = Number(content.totalUnder2_5 ?? 0);

    const predictedOver = overProb > underProb;
    const actualOver = actualTotalGoals > 2.5;

    return predictedOver === actualOver;
  }

  private evaluateBtts(
    content: Record<string, unknown>,
    scoreHome: number,
    scoreAway: number
  ): boolean {
    const bttsYes = Number(content.bothTeamsToScoreYes ?? 0);
    const bttsNo = Number(content.bothTeamsToScoreNo ?? 0);

    const predictedBtts = bttsYes > bttsNo;
    const actualBtts = scoreHome > 0 && scoreAway > 0;

    return predictedBtts === actualBtts;
  }

  async getAccuracyStats(): Promise<{
    outcome: { total: number; correct: number; percentage: number };
    goals: { total: number; correct: number; percentage: number };
    btts: { total: number; correct: number; percentage: number };
  }> {
    const all = await db.predictionAccuracy.findMany();

    const outcomeItems = all.filter((a) => a.outcomeCorrect !== null);
    const goalsItems = all.filter((a) => a.goalsOverUnderCorrect !== null);
    const bttsItems = all.filter((a) => a.bttsCorrect !== null);

    const calc = (items: typeof all, field: 'outcomeCorrect' | 'goalsOverUnderCorrect' | 'bttsCorrect') => {
      const correct = items.filter((a) => a[field]).length;
      return {
        total: items.length,
        correct,
        percentage: items.length > 0 ? Math.round((correct / items.length) * 100) : 0,
      };
    };

    return {
      outcome: calc(outcomeItems, 'outcomeCorrect'),
      goals: calc(goalsItems, 'goalsOverUnderCorrect'),
      btts: calc(bttsItems, 'bttsCorrect'),
    };
  }
}
