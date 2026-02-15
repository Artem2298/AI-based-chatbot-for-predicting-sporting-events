import { vi } from 'vitest';

/**
 * Comprehensive mock translation function based on English locale (en.ftl).
 * Returns predictable English text for each i18n key.
 * Unknown keys return the key name itself.
 */
export function createMockT() {
  const translations: Record<string, string | ((data?: Record<string, unknown>) => string)> = {
    'start-welcome': (data) =>
      `Hello, ${data?.name}! I am a bot AI for football predictions`,
    'league-select': 'Choose a league:',
    'league-no-matches': 'No matches found in this league recently.',
    'league-error': 'Error loading league.',
    'loading-matches': 'Loading matches...',
    'no-upcoming-matches': 'No upcoming matches found',
    'error-fetching-matches': 'Error loading matches',
    'loading-details': 'Loading details...',
    'match-not-found': 'Match not found',
    'status': 'Status',
    'score': 'Score',
    'match-not-started': 'Match not started yet',
    'team-stats': 'Team Stats',
    'get-ai-prediction': 'Get AI Prediction',
    'back-to-matches': 'Back',
    'error-loading-details': 'Error loading details',
    'upcoming-matches': 'Upcoming matches',
    'match-click-hint': 'Click match number for details',

    'btn-back': 'Back',
    'btn-menu': 'Menu',
    'btn-next': 'Next',
    'btn-refresh': 'Refresh',
    'btn-other-predict': 'Other Prediction',
    'btn-stats': 'Stats',
    'btn-to-match': 'To match',
    'btn-standings': 'Standings',

    'match-details': (data) =>
      `${data?.homeTeam} vs ${data?.awayTeam}`,
    'match-date': (data) => `Date: ${data?.date}`,
    'match-league': (data) =>
      `League: ${data?.competition}`,

    'stats-title': 'Match Statistics',
    'stats-form': (data) => `Form: ${data?.form}`,
    'stats-goals': (data) => `Goals: ${data?.goals}`,
    'stats-basic': 'Basic stats',
    'stats-home': 'Home stats',
    'stats-away': 'Away stats',
    'stats-h2h': 'H2H History',
    'stats-full': 'Detailed stats',
    'stats-loading': 'Loading statistics...',
    'stats-last-matches': 'Last matches:',
    'stats-already-on-page': 'You are already on this page',
    'stats-home-title': (data) =>
      `Home Stats: ${data?.team}`,
    'stats-away-title': (data) =>
      `Away Stats: ${data?.team}`,
    'stats-goals-for': (data) =>
      `Scored: ${data?.total} (${data?.avg} avg)`,
    'stats-goals-against': (data) =>
      `Conceded: ${data?.total} (${data?.avg} avg)`,
    'stats-avg': 'avg',
    'stats-wins-draws-losses': (data) =>
      `Wins: ${data?.wins} | Draws: ${data?.draws} | Losses: ${data?.losses}`,
    'stats-h2h-not-found': 'No H2H history found',
    'stats-h2h-recent': 'Recent encounters:',
    'stats-avg-goals': (data) =>
      `Avg goals: ${data?.avg}`,
    'stats-full-teaser': 'Detailed statistics will be available soon!',

    'predict-ai': 'AI Prediction',
    'predict-loading': 'Generating prediction, please wait...',
    'predict-process': 'Generating AI prediction...',
    'predict-gathering': 'Collecting stats...',
    'predict-analyzing': 'Analyzing data...',
    'predict-wait': 'This will take ~5-10 seconds',
    'predict-error': 'Error generating prediction.',
    'predict-insufficient': (data) =>
      `Insufficient stats for ${data?.type}.`,
    'predict-try-later': 'Please try again later.',
    'predict-try-other': 'Try another prediction.',

    'predict-title-outcome': 'Match outcome',
    'predict-title-corners': 'Corners',
    'predict-title-cards': 'Cards',
    'predict-title-offsides': 'Offsides',
    'predict-title-total': 'Total goals (O/U 2.5)',
    'predict-title-btts': 'Both team to score',

    'predict-prob-title': 'PROBABILITIES:',
    'predict-prob-home': (data) => `${data?.team}`,
    'predict-prob-draw': 'Draw',
    'predict-prob-away': (data) => `${data?.team}`,

    'predict-recomm-title': 'RECOMMENDATION:',
    'predict-recomm-win': (data) =>
      `${data?.team} to win`,
    'predict-recomm-draw': 'Draw',

    'predict-conf-title': 'CONFIDENCE:',
    'predict-reason-title': 'REASONING:',
    'predict-disclaimer': 'Prediction does not guarantee results',

    'predict-goals-over': (data) =>
      `Total Over ${data?.val}:`,
    'predict-goals-under': (data) =>
      `Total Under ${data?.val}:`,
    'predict-total-over': 'Over 2.5:',
    'predict-total-under': 'Under 2.5:',
    'predict-total-expected': 'Expected total goals:',
    'predict-btts-yes': 'Both teams score - Yes:',
    'predict-btts-no': 'Both teams score - No:',
    'predict-btn-total': 'Total Over/Under 2.5',
    'predict-btn-btts': 'Both Teams To Score',
    'predict-yes': 'Yes',
    'predict-no': 'No',
    'predict-expected-title': 'EXPECTED VALUES:',
    'predict-expected-total': (data) =>
      `- Total ${data?.type}:`,
    'predict-expected-yellow': '- Yellow Cards:',
    'predict-expected-red': '- Red Cards:',

    'standings-title': (data) =>
      `Standings: ${data?.league}`,
    'standings-error': 'Error loading standings.',
    'standings-loading': 'Loading standings...',
    'standings-not-found': 'Standings not found',
    'standings-season': (data) =>
      `Season ${data?.start}/${data?.end}`,
    'standings-points': 'pts',
    'standings-stats-short': (data) =>
      `P:${data?.played} W:${data?.won} D:${data?.draw} L:${data?.lost}`,
  };

  const mockT = vi.fn(
    (key: string, data?: Record<string, unknown>): string => {
      const value = translations[key];
      if (typeof value === 'function') {
        return value(data || {}) as string;
      }
      if (typeof value === 'string') {
        return value;
      }
      return key;
    }
  );

  return mockT;
}

/**
 * Creates a mock grammY context for handler tests.
 */
export function createMockCtx(overrides?: Record<string, unknown>) {
  const t = createMockT();

  const ctx: Record<string, unknown> = {
    update: {
      callback_query: {
        data: '',
        from: { id: 1 },
      },
    },
    callbackQuery: undefined,
    from: undefined,
    match: undefined,
    answerCallbackQuery: vi.fn().mockResolvedValue(true),
    editMessageText: vi.fn().mockResolvedValue(true),
    reply: vi.fn().mockResolvedValue(true),
    t,
    ...overrides,
  };

  Object.defineProperty(ctx, 'callbackQuery', {
    get: () => (ctx.update as Record<string, unknown>)?.callback_query,
    configurable: true,
  });
  Object.defineProperty(ctx, 'from', {
    get: () =>
      ((ctx.update as Record<string, unknown>)?.callback_query as Record<string, unknown>)?.from,
    configurable: true,
  });

  return ctx;
}
