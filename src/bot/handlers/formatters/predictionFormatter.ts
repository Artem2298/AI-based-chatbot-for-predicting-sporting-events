import {
  MatchOutcomePrediction,
  // CornersPrediction,
  // CardsPrediction,
  // OffsidesPrediction,
  TotalGoalsPrediction,
  BttsPrediction,
} from '@/types/prediction.types';
import { Match } from '@/types/match.types';

type TranslateFn = (
  key: string,
  params?: Record<string, string | number>
) => string;

const formatConfidence = (confidence: number): string => {
  const stars = Math.round(confidence / 20); // 0-5 stars
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

// export const formatCornersPrediction = (
//   match: Match,
//   prediction: CornersPrediction,
//   t: TranslateFn
// ): string => {
//   const lines = [
//     `🚩 *${t('predict-title-corners')}*`,
//     `🏟 ${match.homeTeam} vs ${match.awayTeam}`,
//     '',
//     `📊 *${t('predict-recomm-title')}:* ${prediction.recommendation}`,
//     `🎯 *${t('predict-conf-title')}:* ${formatConfidence(prediction.confidence)}`,
//     '',
//     `📝 *${t('predict-reason-title')}:*`,
//     prediction.reasoning,
//     '',
//     `📈 *${t('predict-expected-title')}:*`,
//     `Expected Total: ${prediction.expectedTotal}`,
//     `Over 9.5: ${prediction.totalOver9_5}%`,
//     `Under 9.5: ${prediction.totalUnder9_5}%`,
//     `Home Over 5.5: ${prediction.homeTeamOver5_5}%`,
//     `Away Over 4.5: ${prediction.awayTeamOver4_5}%`,
//   ];

//   return lines.join('\n');
// };

// export const formatCardsPrediction = (
//   match: Match,
//   prediction: CardsPrediction,
//   t: TranslateFn
// ): string => {
//   const lines = [
//     `🟨 *${t('predict-title-cards')}*`,
//     `🏟 ${match.homeTeam} vs ${match.awayTeam}`,
//     '',
//     `📊 *${t('predict-recomm-title')}:* ${prediction.recommendation}`,
//     `🎯 *${t('predict-conf-title')}:* ${formatConfidence(prediction.confidence)}`,
//     '',
//     `📝 *${t('predict-reason-title')}:*`,
//     prediction.reasoning,
//     '',
//     `📈 *${t('predict-expected-title')}:*`,
//     `Expected Total: ${prediction.expectedTotal}`,
//     `Over 3.5: ${prediction.totalOver3_5}%`,
//     `Under 3.5: ${prediction.totalUnder3_5}%`,
//     `Expected Yellow: ${prediction.expectedYellow}`,
//     `Expected Red: ${prediction.expectedRed}`,
//   ];

//   return lines.join('\n');
// };

// export const formatOffsidesPrediction = (
//   match: Match,
//   prediction: OffsidesPrediction,
//   t: TranslateFn
// ): string => {
//   const lines = [
//     `🏁 *${t('predict-title-offsides')}*`,
//     `🏟 ${match.homeTeam} vs ${match.awayTeam}`,
//     '',
//     `📊 *${t('predict-recomm-title')}:* ${prediction.recommendation}`,
//     `🎯 *${t('predict-conf-title')}:* ${formatConfidence(prediction.confidence)}`,
//     '',
//     `📝 *${t('predict-reason-title')}:*`,
//     prediction.reasoning,
//     '',
//     `📈 *${t('predict-expected-title')}:*`,
//     `Expected Total: ${prediction.expectedTotal}`,
//     `Over 3.5: ${prediction.totalOver3_5}%`,
//     `Under 3.5: ${prediction.totalUnder3_5}%`,
//     `Home Over 1.5: ${prediction.homeTeamOver1_5}%`,
//     `Away Over 1.5: ${prediction.awayTeamOver1_5}%`,
//   ];

//   return lines.join('\n');
// };

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
    `Expected Total Goals: ${prediction.expectedTotalGoals}`,
    `Over 2.5: ${prediction.totalOver2_5}%`,
    `Under 2.5: ${prediction.totalUnder2_5}%`,
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
    `Yes: ${prediction.bothTeamsToScoreYes}%`,
    `No: ${prediction.bothTeamsToScoreNo}%`,
    `Expected Home Goals: ${prediction.expectedHomeGoals}`,
    `Expected Away Goals: ${prediction.expectedAwayGoals}`,
  ];

  return lines.join('\n');
};
