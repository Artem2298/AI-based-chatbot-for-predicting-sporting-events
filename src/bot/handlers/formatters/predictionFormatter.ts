import {
  MatchOutcomePrediction,
  TotalGoalsPrediction,
  BttsPrediction,
} from '@/types/prediction.types';
import { Match } from '@/types/match.types';

type TranslateFn = (
  key: string,
  params?: Record<string, string | number>
) => string;

const formatConfidence = (confidence: number): string => {
  const stars = Math.round(confidence / 20);
  return '⭐'.repeat(stars) + ` (${confidence}%)`;
};

export const formatOutcomePrediction = (
  match: Match,
  prediction: MatchOutcomePrediction,
  t: TranslateFn
): string => {
  let recommendationText: string = prediction.recommendation;
  if (prediction.recommendation === '1') {
    recommendationText = t('predict-recomm-win', { team: match.homeTeam });
  } else if (prediction.recommendation === '2') {
    recommendationText = t('predict-recomm-win', { team: match.awayTeam });
  } else if (prediction.recommendation === 'X') {
    recommendationText = t('predict-recomm-draw');
  }

  const lines = [
    `⚽ *${t('predict-title-outcome')}*`,
    `🏟 ${match.homeTeam} vs ${match.awayTeam}`,
    '',
    `📊 *${t('predict-recomm-title')}:* ${recommendationText}`,
    `🎯 *${t('predict-conf-title')}:* ${formatConfidence(prediction.confidence)}`,
    '',
    `📝 *${t('predict-reason-title')}:*`,
    prediction.reasoning,
    '',
    `📈 *${t('predict-prob-title')}:*`,
    `🏠 ${match.homeTeam}: ${prediction.homeWin}%`,
    `🤝 ${t('predict-prob-draw')}: ${prediction.draw}%`,
    `✈️ ${match.awayTeam}: ${prediction.awayWin}%`,
  ];

  return lines.join('\n');
};

export const formatTotalPrediction = (
  match: Match,
  prediction: TotalGoalsPrediction,
  t: TranslateFn
): string => {
  const lines = [
    `🥅 *${t('predict-title-total')}*`,
    `🏟 ${match.homeTeam} vs ${match.awayTeam}`,
    '',
    `📊 *${t('predict-recomm-title')}:* ${prediction.recommendation}`,
    `🎯 *${t('predict-conf-title')}:* ${formatConfidence(prediction.confidence)}`,
    '',
    `📝 *${t('predict-reason-title')}:*`,
    prediction.reasoning,
    '',
    `📈 *${t('predict-expected-title')}:*`,
    `${t('predict-expected-goals')} ${prediction.expectedTotalGoals}`,
    `${t('predict-total-over')} ${prediction.totalOver2_5}%`,
    `${t('predict-total-under')} ${prediction.totalUnder2_5}%`,
  ];

  return lines.join('\n');
};

export const formatBttsPrediction = (
  match: Match,
  prediction: BttsPrediction,
  t: TranslateFn
): string => {
  const lines = [
    `🥅 *${t('predict-title-btts')}*`,
    `🏟 ${match.homeTeam} vs ${match.awayTeam}`,
    '',
    `📊 *${t('predict-recomm-title')}:* ${prediction.recommendation}`,
    `🎯 *${t('predict-conf-title')}:* ${formatConfidence(prediction.confidence)}`,
    '',
    `📝 *${t('predict-reason-title')}:*`,
    prediction.reasoning,
    '',
    `📈 *${t('predict-expected-title')}:*`,
    `${t('predict-yes')}: ${prediction.bothTeamsToScoreYes}%`,
    `${t('predict-no')}: ${prediction.bothTeamsToScoreNo}%`,
    `${t('predict-expected-home-goals')} ${prediction.expectedHomeGoals}`,
    `${t('predict-expected-away-goals')} ${prediction.expectedAwayGoals}`,
  ];

  return lines.join('\n');
};
