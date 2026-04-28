import { createLogger } from '@/utils/logger';

const log = createLogger('prediction-validator');

export type RawAIPrediction = Record<string, number | string | undefined>;

export class PredictionValidator {
  validateAndNormalizeOutcomePrediction(prediction: RawAIPrediction): void {
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

  validateTotalPrediction(prediction: RawAIPrediction): void {
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

  validateBttsPrediction(prediction: RawAIPrediction): void {
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
