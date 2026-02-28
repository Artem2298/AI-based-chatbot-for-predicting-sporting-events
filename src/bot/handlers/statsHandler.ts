import { Composer, InlineKeyboard } from 'grammy';
import { MatchService } from '@/services/matchService';
import { userMatchesState } from './matchHandler';
import { formatMatchResult, getResultEmoji } from '../utils/formatters';
import {
  calculateTeamStats,
  filterHomeMatches,
  filterAwayMatches,
} from '../utils/statsCalculator';
import { BotContext } from '@/types/context';
import { createLogger } from '@/utils/logger';

const log = createLogger('handler:stats');
const STATS_PER_PAGE = 5;

export function createStatsComposer(
  matchService: MatchService
): Composer<BotContext> {
  const composer = new Composer<BotContext>();

  composer.callbackQuery(/^stats:basic:(\d+)(?::(\d+))?$/, async (ctx) => {
    const matchId = parseInt(ctx.match[1]);
    const page = parseInt(ctx.match[2] || '0');
    const userId = ctx.from.id;

    await ctx.answerCallbackQuery();

    try {
      const matchDetails = await matchService.getMatchDetails(matchId);

      const homeTeamMatches = (await matchService.getTeamLastMatches(
        matchDetails.homeTeamId,
        15,
        matchDetails.competitionCode
      )).slice();
      const awayTeamMatches = (await matchService.getTeamLastMatches(
        matchDetails.awayTeamId,
        15,
        matchDetails.competitionCode
      )).slice();

      const maxLen = Math.max(homeTeamMatches.length, awayTeamMatches.length);
      const totalPages = Math.ceil(maxLen / STATS_PER_PAGE);
      const homePageMatches = homeTeamMatches.slice(page * STATS_PER_PAGE, (page + 1) * STATS_PER_PAGE);
      const awayPageMatches = awayTeamMatches.slice(page * STATS_PER_PAGE, (page + 1) * STATS_PER_PAGE);

      let message = `📊 ${ctx.t('stats-last-matches')}\n\n`;

      message += `🏠 ${matchDetails.homeTeam.toUpperCase()}\n`;
      message += `━━━━━━━━━━━━━━━━━━━━\n`;
      message += `📈 ${ctx.t('stats-last-matches')}\n`;

      homePageMatches.forEach((match) => {
        const emoji = getResultEmoji(match, matchDetails.homeTeam);
        message += `${emoji} ${formatMatchResult(match)}\n`;
      });
      message += '\n';

      message += `✈️ ${matchDetails.awayTeam.toUpperCase()}\n`;
      message += `━━━━━━━━━━━━━━━━━━━━\n`;
      message += `📈 ${ctx.t('stats-last-matches')}\n`;

      awayPageMatches.forEach((match) => {
        const emoji = getResultEmoji(match, matchDetails.awayTeam);
        message += `${emoji} ${formatMatchResult(match)}\n`;
      });

      const keyboard = createStatsKeyboard(
        ctx,
        matchId,
        getMatchIndex(userId, matchId),
        'basic',
        page,
        totalPages
      );

      await ctx.editMessageText(message, {
        reply_markup: keyboard,
        parse_mode: 'Markdown',
      });
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'description' in error &&
        typeof error.description === 'string' &&
        error.description.includes('message is not modified')
      ) {
        await ctx.answerCallbackQuery({
          text: ctx.t('stats-already-on-page'),
        });
        return;
      }

      log.error({ matchId, err: error }, 'failed to fetch stats');
      await ctx.reply(ctx.t('standings-error'));
    }
  });

  composer.callbackQuery(/^stats:home:(\d+)(?::(\d+))?$/, async (ctx) => {
    const matchId = parseInt(ctx.match[1]);
    const page = parseInt(ctx.match[2] || '0');
    const userId = ctx.from.id;

    await ctx.answerCallbackQuery();

    try {
      const matchDetails = await matchService.getMatchDetails(matchId);

      const allMatches = await matchService.getTeamLastMatches(
        matchDetails.homeTeamId,
        50,
        matchDetails.competitionCode
      );

      const homeMatches = filterHomeMatches(
        allMatches,
        matchDetails.homeTeam
      ).slice(0, 15).slice().reverse();

      const totalPages = Math.ceil(homeMatches.length / STATS_PER_PAGE);
      const pageMatches = homeMatches.slice(page * STATS_PER_PAGE, (page + 1) * STATS_PER_PAGE);

      let message = `🏠 ${ctx.t('stats-home-title', { team: matchDetails.homeTeam })}\n\n`;
      message += `📈 ${ctx.t('stats-last-matches')}\n`;

      pageMatches.forEach((match) => {
        const emoji = getResultEmoji(match, matchDetails.homeTeam);
        message += `${emoji} ${formatMatchResult(match)}\n`;
      });

      const stats = calculateTeamStats(homeMatches, matchDetails.homeTeam);
      message += `\n🔥 ${ctx.t('stats-form', { form: stats.form })}\n`;
      message += `⚽ ${ctx.t('stats-goals-for', { total: stats.goalsFor, avg: stats.avgGoalsFor })}\n`;
      message += `🥅 ${ctx.t('stats-goals-against', { total: stats.goalsAgainst, avg: stats.avgGoalsAgainst })}\n`;
      message += `🏆 ${ctx.t('stats-wins-draws-losses', { wins: stats.wins, draws: stats.draws, losses: stats.losses })}`;

      const keyboard = createStatsKeyboard(
        ctx,
        matchId,
        getMatchIndex(userId, matchId),
        'home',
        page,
        totalPages
      );

      await ctx.editMessageText(message, {
        reply_markup: keyboard,
        parse_mode: 'Markdown',
      });
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'description' in error &&
        typeof error.description === 'string' &&
        error.description.includes('message is not modified')
      ) {
        await ctx.answerCallbackQuery({
          text: ctx.t('stats-already-on-page'),
        });
        return;
      }

      log.error({ matchId, err: error }, 'failed to fetch home stats');
      await ctx.reply(ctx.t('standings-error'));
    }
  });

  composer.callbackQuery(/^stats:away:(\d+)(?::(\d+))?$/, async (ctx) => {
    const matchId = parseInt(ctx.match[1]);
    const page = parseInt(ctx.match[2] || '0');
    const userId = ctx.from.id;

    await ctx.answerCallbackQuery();

    try {
      const matchDetails = await matchService.getMatchDetails(matchId);

      const allMatches = await matchService.getTeamLastMatches(
        matchDetails.awayTeamId,
        50,
        matchDetails.competitionCode
      );

      const awayMatches = filterAwayMatches(
        allMatches,
        matchDetails.awayTeam
      ).slice(0, 15).slice().reverse();

      const totalPages = Math.ceil(awayMatches.length / STATS_PER_PAGE);
      const pageMatches = awayMatches.slice(page * STATS_PER_PAGE, (page + 1) * STATS_PER_PAGE);

      let message = `✈️ ${ctx.t('stats-away-title', { team: matchDetails.awayTeam })}\n\n`;
      message += `📈 ${ctx.t('stats-last-matches')}\n`;

      pageMatches.forEach((match) => {
        const emoji = getResultEmoji(match, matchDetails.awayTeam);
        message += `${emoji} ${formatMatchResult(match)}\n`;
      });

      const stats = calculateTeamStats(awayMatches, matchDetails.awayTeam);
      message += `\n⚠️ ${ctx.t('stats-form', { form: stats.form })}\n`;
      message += `⚽ ${ctx.t('stats-goals-for', { total: stats.goalsFor, avg: stats.avgGoalsFor })}\n`;
      message += `🥅 ${ctx.t('stats-goals-against', { total: stats.goalsAgainst, avg: stats.avgGoalsAgainst })}\n`;
      message += `🏆 ${ctx.t('stats-wins-draws-losses', { wins: stats.wins, draws: stats.draws, losses: stats.losses })}`;

      const keyboard = createStatsKeyboard(
        ctx,
        matchId,
        getMatchIndex(userId, matchId),
        'away',
        page,
        totalPages
      );

      await ctx.editMessageText(message, {
        reply_markup: keyboard,
        parse_mode: 'Markdown',
      });
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'description' in error &&
        typeof error.description === 'string' &&
        error.description.includes('message is not modified')
      ) {
        await ctx.answerCallbackQuery({
          text: ctx.t('stats-already-on-page'),
        });
        return;
      }

      log.error({ matchId, err: error }, 'failed to fetch away stats');
      await ctx.reply(ctx.t('standings-error'));
    }
  });

  composer.callbackQuery(/^stats:h2h:(\d+)(?::(\d+))?$/, async (ctx) => {
    const matchId = parseInt(ctx.match[1]);
    const page = parseInt(ctx.match[2] || '0');
    const userId = ctx.from.id;

    await ctx.answerCallbackQuery();

    try {
      const matchDetails = await matchService.getMatchDetails(matchId);
      const h2hMatches = (await matchService.getHeadToHead(
        matchId, 15, matchDetails.homeTeamId, matchDetails.awayTeamId
      )).slice();

      if (h2hMatches.length === 0) {
        await ctx.reply(ctx.t('stats-h2h-not-found'));
        return;
      }

      const totalPages = Math.ceil(h2hMatches.length / STATS_PER_PAGE);
      const pageMatches = h2hMatches.slice(page * STATS_PER_PAGE, (page + 1) * STATS_PER_PAGE);

      // Stats calculated from ALL matches, not just current page
      let homeWins = 0;
      let draws = 0;
      let awayWins = 0;

      h2hMatches.forEach((match) => {
        const isHomeTeamHome = match.homeTeam === matchDetails.homeTeam;
        if (match.score.home! > match.score.away!) {
          if (isHomeTeamHome) homeWins++; else awayWins++;
        } else if (match.score.home! < match.score.away!) {
          if (isHomeTeamHome) awayWins++; else homeWins++;
        } else {
          draws++;
        }
      });

      let message = `📜 ${ctx.t('stats-h2h')}\n`;
      message += `🏟️ ${matchDetails.homeTeam} vs ${matchDetails.awayTeam}\n\n`;
      message += `${ctx.t('stats-h2h-recent')}\n`;

      pageMatches.forEach((match) => {
        const isHomeTeamHome = match.homeTeam === matchDetails.homeTeam;

        let emoji = '';
        if (match.score.home! > match.score.away!) {
          emoji = isHomeTeamHome ? '✅' : '❌';
        } else if (match.score.home! < match.score.away!) {
          emoji = isHomeTeamHome ? '❌' : '✅';
        } else {
          emoji = '🟰';
        }

        message += `${emoji} ${formatMatchResult(match)}\n`;
      });

      message += `\n📊 ${ctx.t('predict-prob-title')}\n`;
      message += `🏠 ${matchDetails.homeTeam}: ${homeWins} ${ctx.t('predict-recomm-win', { team: '' }).trim()}\n`;
      message += `🟰 ${ctx.t('predict-prob-draw')}: ${draws}\n`;
      message += `✈️ ${matchDetails.awayTeam}: ${awayWins} ${ctx.t('predict-recomm-win', { team: '' }).trim()}\n`;

      const totalGoals = h2hMatches.reduce(
        (sum, match) => sum + (match.score.home || 0) + (match.score.away || 0),
        0
      );
      const avgGoals = (totalGoals / h2hMatches.length).toFixed(1);

      message += `⚽ ${ctx.t('stats-avg-goals', { avg: avgGoals })}\n`;

      const keyboard = createStatsKeyboard(
        ctx,
        matchId,
        getMatchIndex(userId, matchId),
        'h2h',
        page,
        totalPages
      );

      try {
        await ctx.editMessageText(message, {
          reply_markup: keyboard,
          parse_mode: 'Markdown',
        });
      } catch (error) {
        if (
          error &&
          typeof error === 'object' &&
          'description' in error &&
          typeof error.description === 'string' &&
          error.description.includes('message is not modified')
        ) {
          await ctx.answerCallbackQuery();
          return;
        }

        await ctx.reply(message, {
          reply_markup: keyboard,
          parse_mode: 'Markdown',
        });
      }
    } catch (error) {
      log.error({ matchId, err: error }, 'failed to fetch head-to-head');
      await ctx.reply(ctx.t('standings-error'));
    }
  });

  return composer;
}

function createStatsKeyboard(
  ctx: BotContext,
  matchId: number,
  matchIndex: number,
  statsType: string = '',
  currentPage: number = 0,
  totalPages: number = 1
): InlineKeyboard {
  const t = ctx.t.bind(ctx);
  const keyboard = new InlineKeyboard();

  if (totalPages > 1 && statsType) {
    if (currentPage > 0) keyboard.text(`⬅️ ${t('btn-back')}`, `stats:${statsType}:${matchId}:${currentPage - 1}`);
    if (currentPage < totalPages - 1) keyboard.text(`${t('btn-next')} ➡️`, `stats:${statsType}:${matchId}:${currentPage + 1}`);
    keyboard.row();
  }

  keyboard
    .text(`📊 ${t('stats-basic')}`, `stats:basic:${matchId}`)
    .row()
    .text(`🏠 ${t('stats-home')}`, `stats:home:${matchId}`)
    .row()
    .text(`✈️ ${t('stats-away')}`, `stats:away:${matchId}`)
    .row()
    .text(`📜 ${t('stats-h2h')}`, `stats:h2h:${matchId}`)
    .row()
    .text(`🎯 ${t('predict-ai')}`, `predict:${matchId}`)
    .row()
    .text(`◀️ ${t('btn-to-match')}`, `match:${matchIndex}`);

  return keyboard;
}

function getMatchIndex(userId: number, matchId: number): number {
  const state = userMatchesState.get(userId);
  if (!state) return 0;
  return state.matches.findIndex((m) => m.id === matchId);
}
