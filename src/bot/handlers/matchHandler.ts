import { Composer, InlineKeyboard } from 'grammy';
import { MatchService } from '@/services/matchService';
import { NotificationService } from '@/services/notificationService';
import { DbService } from '@/services/dbService';
import { formatDate, formatTime, formatMatchesList } from '../utils/formatters';
import { mainKeyboard } from '../keyboards/main.keyboard';
import { Match } from '@/types/match.types';
import { BotContext } from '@/types/context';
import { createLogger } from '@/utils/logger';

const log = createLogger('handler:match');

const MATCHES_PER_PAGE = 6;

export const userMatchesState = new Map<
  number,
  {
    matches: Match[];
    leagueCode: string;
    currentPage: number;
  }
>();

export function createMatchComposer(
  matchService: MatchService,
  notificationService: NotificationService
): Composer<BotContext> {
  const composer = new Composer<BotContext>();

  composer.callbackQuery(/^match:(\d+)$/, async (ctx) => {
    const matchIndex = parseInt(ctx.match[1]);
    const userId = ctx.from.id;
    const state = userMatchesState.get(userId);

    if (!state) {
      await showLeagueSelection(ctx);
      return;
    }

    await ctx.answerCallbackQuery({
      text: ctx.t('loading-details'),
    });

    const match = state.matches[matchIndex];

    if (!match) {
      await ctx.reply(ctx.t('match-not-found') + ' 😔');
      return;
    }

    try {
      const matchDetails = await matchService.getMatchDetails(match.id);

      let isSubscribed = false;
      const dbUser = await DbService.getUserByTelegramId(ctx.from.id);
      if (dbUser) {
        isSubscribed = await notificationService.isSubscribed(dbUser.id, match.id);
      }

      let message = `🏟️ **${matchDetails.homeTeam}** vs **${matchDetails.awayTeam}**\n\n`;
      message += `📅 ${formatDate(matchDetails.date)}\n`;
      message += `⏰ ${formatTime(matchDetails.date)}\n`;
      message += `🏆 ${matchDetails.competition}\n`;
      message += `🔴 ${ctx.t('status')}: ${matchDetails.status}\n\n`;

      if (
        matchDetails.score.home !== null &&
        matchDetails.score.away !== null
      ) {
        message += `⚽ ${ctx.t('score')}: **${matchDetails.score.home} - ${matchDetails.score.away}**\n`;
      } else {
        message += `⚽ ${ctx.t('match-not-started')}\n`;
      }

      const keyboard = new InlineKeyboard()
        .text(`📊 ${ctx.t('team-stats')}`, `stats:basic:${match.id}`)
        .row()
        .text(`🎯 ${ctx.t('get-ai-prediction')}`, `predict:${match.id}`)
        .row();

      if (matchDetails.status !== 'FINISHED') {
        if (isSubscribed) {
          keyboard.text(`🔕 ${ctx.t('btn-unfollow')}`, `unsub:${match.id}`);
        } else {
          keyboard.text(`🔔 ${ctx.t('btn-follow')}`, `sub:${match.id}`);
        }
        keyboard.row();
      }

      keyboard.text(
        `◀️ ${ctx.t('back-to-matches')}`,
        `back:matches:${state.leagueCode}`
      );

      await ctx.editMessageText(message, {
        reply_markup: keyboard,
        parse_mode: 'Markdown',
      });
    } catch (error) {
      log.error({ matchId: match.id, err: error }, 'failed to fetch match details');
      await ctx.reply(ctx.t('error-loading-details') + ' 😔');
    }
  });

  composer.callbackQuery(/^sub:(\d+)$/, async (ctx) => {
    const matchId = parseInt(ctx.match[1]);
    const dbUser = await DbService.getUserByTelegramId(ctx.from.id);

    if (!dbUser) {
      await ctx.answerCallbackQuery({ text: '❌' });
      return;
    }

    await notificationService.subscribe(dbUser.id, matchId);
    await ctx.answerCallbackQuery({ text: ctx.t('notify-subscribed') });

    const state = userMatchesState.get(ctx.from.id);
    if (state) {
      const matchIndex = state.matches.findIndex((m) => m.id === matchId);
      if (matchIndex !== -1) {
        await renderMatchDetails(ctx, matchService, notificationService, matchId, state);
      }
    }
  });

  composer.callbackQuery(/^unsub:(\d+)$/, async (ctx) => {
    const matchId = parseInt(ctx.match[1]);
    const dbUser = await DbService.getUserByTelegramId(ctx.from.id);

    if (!dbUser) {
      await ctx.answerCallbackQuery({ text: '❌' });
      return;
    }

    await notificationService.unsubscribe(dbUser.id, matchId);
    await ctx.answerCallbackQuery({ text: ctx.t('notify-unsubscribed') });

    const state = userMatchesState.get(ctx.from.id);
    if (state) {
      const matchIndex = state.matches.findIndex((m) => m.id === matchId);
      if (matchIndex !== -1) {
        await renderMatchDetails(ctx, matchService, notificationService, matchId, state);
      }
    }
  });
  composer.callbackQuery(/^back:matches:(.+)$/, async (ctx) => {
    const userId = ctx.from.id;
    const state = userMatchesState.get(userId);

    if (!state) {
      await showLeagueSelection(ctx);
      return;
    }

    await ctx.answerCallbackQuery();
    await showMatchesPage(ctx, userId, state.currentPage);
  });

  return composer;
}

async function renderMatchDetails(
  ctx: BotContext,
  matchService: MatchService,
  notificationService: NotificationService,
  matchId: number,
  state: { matches: Match[]; leagueCode: string }
) {
  try {
    const matchDetails = await matchService.getMatchDetails(matchId);

    let isSubscribed = false;
    const dbUser = await DbService.getUserByTelegramId(ctx.from!.id);
    if (dbUser) {
      isSubscribed = await notificationService.isSubscribed(dbUser.id, matchId);
    }

    let message = `🏟️ **${matchDetails.homeTeam}** vs **${matchDetails.awayTeam}**\n\n`;
    message += `📅 ${formatDate(matchDetails.date)}\n`;
    message += `⏰ ${formatTime(matchDetails.date)}\n`;
    message += `🏆 ${matchDetails.competition}\n`;
    message += `🔴 ${ctx.t('status')}: ${matchDetails.status}\n\n`;

    if (
      matchDetails.score.home !== null &&
      matchDetails.score.away !== null
    ) {
      message += `⚽ ${ctx.t('score')}: **${matchDetails.score.home} - ${matchDetails.score.away}**\n`;
    } else {
      message += `⚽ ${ctx.t('match-not-started')}\n`;
    }

    const keyboard = new InlineKeyboard()
      .text(`📊 ${ctx.t('team-stats')}`, `stats:basic:${matchId}`)
      .row()
      .text(`🎯 ${ctx.t('get-ai-prediction')}`, `predict:${matchId}`)
      .row();

    if (matchDetails.status !== 'FINISHED') {
      if (isSubscribed) {
        keyboard.text(`🔕 ${ctx.t('btn-unfollow')}`, `unsub:${matchId}`);
      } else {
        keyboard.text(`🔔 ${ctx.t('btn-follow')}`, `sub:${matchId}`);
      }
      keyboard.row();
    }

    keyboard.text(
      `◀️ ${ctx.t('back-to-matches')}`,
      `back:matches:${state.leagueCode}`
    );

    await ctx.editMessageText(message, {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    });
  } catch (error) {
    log.error({ matchId, err: error }, 'failed to re-render match details');
  }
}

export async function showMatchesPage(
  ctx: BotContext,
  userId: number,
  page: number
) {
  const state = userMatchesState.get(userId);

  if (!state) {
    return;
  }

  const { matches, leagueCode } = state;

  const startIdx = page * MATCHES_PER_PAGE;
  const endIdx = Math.min(startIdx + MATCHES_PER_PAGE, matches.length);
  const pageMatches = matches.slice(startIdx, endIdx);

  const totalPages = Math.ceil(matches.length / MATCHES_PER_PAGE);

  let message = `⚽ ${ctx.t('upcoming-matches')} (${page + 1}/${totalPages})\n\n`;
  message += formatMatchesList(pageMatches, startIdx);
  message += `\n💡 ${ctx.t('match-click-hint')}`;

  const keyboard = new InlineKeyboard();

  pageMatches.forEach((_, idx) => {
    const globalIdx = startIdx + idx;
    keyboard.text(`${globalIdx + 1}`, `match:${globalIdx}`);

    if ((idx + 1) % 3 === 0) {
      keyboard.row();
    }
  });

  if (pageMatches.length % 3 !== 0) {
    keyboard.row();
  }

  const navButtons: Array<{ text: string; callback: string }> = [];

  if (page > 0) {
    navButtons.push({
      text: `⬅️ ${ctx.t('btn-back')}`,
      callback: `page:prev:${leagueCode}`,
    });
  }

  if (page < totalPages - 1) {
    navButtons.push({
      text: `${ctx.t('btn-next')} ➡️`,
      callback: `page:next:${leagueCode}`,
    });
  }

  if (navButtons.length > 0) {
    navButtons.forEach((btn) => keyboard.text(btn.text, btn.callback));
    keyboard.row();
  }

  keyboard
    .text(`📊 ${ctx.t('btn-standings')}`, `standings:${leagueCode}`)
    .row();
  keyboard.text(`◀️ ${ctx.t('btn-back')}`, 'back:main');

  try {
    await ctx.editMessageText(message, {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    });
  } catch {
    await ctx.reply(message, {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    });
  }
}

async function showLeagueSelection(ctx: BotContext) {
  await ctx.answerCallbackQuery({
    text: ctx.t('league-error'),
  });

  await ctx.reply(ctx.t('league-select'), {
    reply_markup: mainKeyboard,
  });
}
