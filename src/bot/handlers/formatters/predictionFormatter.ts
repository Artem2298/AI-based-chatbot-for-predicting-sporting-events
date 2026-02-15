import { formatDate } from '../../utils/formatters';
import { Match } from '@/types/match.types';
import {
  MatchOutcomePrediction,
  CornersPrediction,
  CardsPrediction,
  OffsidesPrediction,
  TotalGoalsPrediction,
  BttsPrediction,
} from '@/types/prediction.types';
import { TranslateFunction } from '@grammyjs/i18n';

type TranslateFn = TranslateFunction;

export function formatOutcomePrediction(
  match: Match,
  prediction: MatchOutcomePrediction,
  t: TranslateFn
): string {
  const recommendationEmoji =
    prediction.recommendation === '1'
      ? '🏠'
      : prediction.recommendation === 'X'
        ? '🤝'
        : '✈️';

  const recommendationText =
    prediction.recommendation === '1'
      ? t('predict-recomm-win', { team: match.homeTeam })
      : prediction.recommendation === 'X'
        ? t('predict-recomm-draw')
        : t('predict-recomm-win', { team: match.awayTeam });

  const confidenceBar = '█'.repeat(Math.floor(prediction.confidence / 10));
  const confidenceEmptyBar = '░'.repeat(
    10 - Math.floor(prediction.confidence / 10)
  );

  return `
${t('predict-title-outcome')}

⚽ ${match.homeTeam} vs ${match.awayTeam}
📅 ${formatDate(match.date)}

━━━━━━━━━━━━━━━━━━
${t('predict-prob-title')}

🏠 ${t('predict-prob-home', { team: match.homeTeam })}
   ${prediction.homeWin}% ${'▓'.repeat(Math.floor(prediction.homeWin / 5))}

🤝 ${t('predict-prob-draw')}
   ${prediction.draw}% ${'▓'.repeat(Math.floor(prediction.draw / 5))}

✈️ ${t('predict-prob-away', { team: match.awayTeam })}
   ${prediction.awayWin}% ${'▓'.repeat(Math.floor(prediction.awayWin / 5))}

━━━━━━━━━━━━━━━━━━
${recommendationEmoji} ${t('predict-recomm-title')} ${recommendationText}

💪 ${t('predict-conf-title')} ${prediction.confidence}%
${confidenceBar}${confidenceEmptyBar}

━━━━━━━━━━━━━━━━━━
${t('predict-reason-title')}
${prediction.reasoning}

━━━━━━━━━━━━━━━━━━
${t('predict-disclaimer')}
  `.trim();
}

export function formatCornersPrediction(
  match: Match,
  prediction: CornersPrediction,
  t: TranslateFn
): string {
  const confidenceBar = '█'.repeat(Math.floor(prediction.confidence / 10));
  const confidenceEmptyBar = '░'.repeat(
    10 - Math.floor(prediction.confidence / 10)
  );

  return `
${t('predict-title-corners')}

⚽ ${match.homeTeam} vs ${match.awayTeam}
📅 ${formatDate(match.date)}

━━━━━━━━━━━━━━━━━━
${t('predict-prob-title')}

🚩 ${t('predict-goals-over', { val: '9.5' })} ${prediction.totalOver9_5}%
${'▓'.repeat(Math.floor(prediction.totalOver9_5 / 5))}

🚩 ${t('predict-goals-under', { val: '9.5' })} ${prediction.totalUnder9_5}%
${'▓'.repeat(Math.floor(prediction.totalUnder9_5 / 5))}

━━━━━━━━━━━━━━━━━━
📊 ${t('stats-full')}:

🏠 ${match.homeTeam} > 5.5: ${prediction.homeTeamOver5_5}%
✈️ ${match.awayTeam} > 4.5: ${prediction.awayTeamOver4_5}%

━━━━━━━━━━━━━━━━━━
${t('predict-expected-title')}

${t('predict-expected-total', { type: t('predict-title-corners').toLowerCase() })} ${prediction.expectedTotal}
- ${match.homeTeam}: ${prediction.expectedHome}
- ${match.awayTeam}: ${prediction.expectedAway}

━━━━━━━━━━━━━━━━━━
💡 ${t('predict-recomm-title')} ${prediction.recommendation}

💪 ${t('predict-conf-title')} ${prediction.confidence}%
${confidenceBar}${confidenceEmptyBar}

━━━━━━━━━━━━━━━━━━
${t('predict-reason-title')}
${prediction.reasoning}

━━━━━━━━━━━━━━━━━━
${t('predict-disclaimer')}
  `.trim();
}

export function formatCardsPrediction(
  match: Match,
  prediction: CardsPrediction,
  t: TranslateFn
): string {
  const confidenceBar = '█'.repeat(Math.floor(prediction.confidence / 10));
  const confidenceEmptyBar = '░'.repeat(
    10 - Math.floor(prediction.confidence / 10)
  );

  return `
${t('predict-title-cards')}

⚽ ${match.homeTeam} vs ${match.awayTeam}
📅 ${formatDate(match.date)}

━━━━━━━━━━━━━━━━━━
${t('predict-prob-title')}

🟨 ${t('predict-goals-over', { val: '3.5' })} ${prediction.totalOver3_5}%
${'▓'.repeat(Math.floor(prediction.totalOver3_5 / 5))}

🟨 ${t('predict-goals-under', { val: '3.5' })} ${prediction.totalUnder3_5}%
${'▓'.repeat(Math.floor(prediction.totalUnder3_5 / 5))}

━━━━━━━━━━━━━━━━━━
📊 ${t('stats-full')}:

🏠 ${match.homeTeam} > 1.5: ${prediction.homeTeamOver1_5}%
✈️ ${match.awayTeam} > 1.5: ${prediction.awayTeamOver1_5}%

━━━━━━━━━━━━━━━━━━
${t('predict-expected-title')}

${t('predict-expected-yellow')} ${prediction.expectedYellow}
${t('predict-expected-red')} ${prediction.expectedRed}
${t('predict-expected-total', { type: t('predict-title-cards').toLowerCase() })} ${prediction.expectedTotal}

━━━━━━━━━━━━━━━━━━
💡 ${t('predict-recomm-title')} ${prediction.recommendation}

💪 ${t('predict-conf-title')} ${prediction.confidence}%
${confidenceBar}${confidenceEmptyBar}

━━━━━━━━━━━━━━━━━━
${t('predict-reason-title')}
${prediction.reasoning}

━━━━━━━━━━━━━━━━━━
${t('predict-disclaimer')}
  `.trim();
}

export function formatOffsidesPrediction(
  match: Match,
  prediction: OffsidesPrediction,
  t: TranslateFn
): string {
  const confidenceBar = '█'.repeat(Math.floor(prediction.confidence / 10));
  const confidenceEmptyBar = '░'.repeat(
    10 - Math.floor(prediction.confidence / 10)
  );

  return `
${t('predict-title-offsides')}

⚽ ${match.homeTeam} vs ${match.awayTeam}
📅 ${formatDate(match.date)}

━━━━━━━━━━━━━━━━━━
${t('predict-prob-title')}

⚠️ ${t('predict-goals-over', { val: '3.5' })} ${prediction.totalOver3_5}%
${'▓'.repeat(Math.floor(prediction.totalOver3_5 / 5))}

⚠️ ${t('predict-goals-under', { val: '3.5' })} ${prediction.totalUnder3_5}%
${'▓'.repeat(Math.floor(prediction.totalUnder3_5 / 5))}

━━━━━━━━━━━━━━━━━━
📊 ${t('stats-full')}:

🏠 ${match.homeTeam} > 1.5: ${prediction.homeTeamOver1_5}%
✈️ ${match.awayTeam} > 1.5: ${prediction.awayTeamOver1_5}%

━━━━━━━━━━━━━━━━━━
${t('predict-expected-title')}

${t('predict-expected-total', { type: t('predict-title-offsides').toLowerCase() })} ${prediction.expectedTotal}
- ${match.homeTeam}: ${prediction.expectedHome}
- ${match.awayTeam}: ${prediction.expectedAway}

━━━━━━━━━━━━━━━━━━
💡 ${t('predict-recomm-title')} ${prediction.recommendation}

💪 ${t('predict-conf-title')} ${prediction.confidence}%
${confidenceBar}${confidenceEmptyBar}

━━━━━━━━━━━━━━━━━━
${t('predict-reason-title')}
${prediction.reasoning}

━━━━━━━━━━━━━━━━━━
${t('predict-disclaimer')}
  `.trim();
}

export function formatTotalPrediction(
  match: Match,
  prediction: TotalGoalsPrediction,
  t: TranslateFn
): string {
  const confidenceBar = '█'.repeat(Math.floor(prediction.confidence / 10));
  const confidenceEmptyBar = '░'.repeat(
    10 - Math.floor(prediction.confidence / 10)
  );

  return `
${t('predict-title-total')}

⚽ ${match.homeTeam} vs ${match.awayTeam}
📅 ${formatDate(match.date)}

━━━━━━━━━━━━━━━━━━
${t('predict-prob-title')}

⬆️ ${t('predict-total-over')} ${prediction.totalOver2_5}%
${'▓'.repeat(Math.floor(prediction.totalOver2_5 / 5))}

⬇️ ${t('predict-total-under')} ${prediction.totalUnder2_5}%
${'▓'.repeat(Math.floor(prediction.totalUnder2_5 / 5))}

━━━━━━━━━━━━━━━━━━
${t('predict-expected-title')}

- ${t('predict-total-expected')} ${prediction.expectedTotalGoals}
- ${match.homeTeam}: ${prediction.expectedHomeGoals}
- ${match.awayTeam}: ${prediction.expectedAwayGoals}

━━━━━━━━━━━━━━━━━━
💡 ${t('predict-recomm-title')} ${prediction.recommendation}

💪 ${t('predict-conf-title')} ${prediction.confidence}%
${confidenceBar}${confidenceEmptyBar}

━━━━━━━━━━━━━━━━━━
${t('predict-reason-title')}
${prediction.reasoning}

━━━━━━━━━━━━━━━━━━
${t('predict-disclaimer')}
  `.trim();
}

export function formatBttsPrediction(
  match: Match,
  prediction: BttsPrediction,
  t: TranslateFn
): string {
  const confidenceBar = '█'.repeat(Math.floor(prediction.confidence / 10));
  const confidenceEmptyBar = '░'.repeat(
    10 - Math.floor(prediction.confidence / 10)
  );

  return `
${t('predict-title-btts')}

⚽ ${match.homeTeam} vs ${match.awayTeam}
📅 ${formatDate(match.date)}

━━━━━━━━━━━━━━━━━━
${t('predict-prob-title')}

✅ ${t('predict-btts-yes')} ${prediction.bothTeamsToScoreYes}%
${'▓'.repeat(Math.floor(prediction.bothTeamsToScoreYes / 5))}

❌ ${t('predict-btts-no')} ${prediction.bothTeamsToScoreNo}%
${'▓'.repeat(Math.floor(prediction.bothTeamsToScoreNo / 5))}

━━━━━━━━━━━━━━━━━━
${t('predict-expected-title')}

- ${match.homeTeam}: ${prediction.expectedHomeGoals}
- ${match.awayTeam}: ${prediction.expectedAwayGoals}

━━━━━━━━━━━━━━━━━━
💡 ${t('predict-recomm-title')} ${prediction.recommendation}

💪 ${t('predict-conf-title')} ${prediction.confidence}%
${confidenceBar}${confidenceEmptyBar}

━━━━━━━━━━━━━━━━━━
${t('predict-reason-title')}
${prediction.reasoning}

━━━━━━━━━━━━━━━━━━
${t('predict-disclaimer')}
  `.trim();
}
