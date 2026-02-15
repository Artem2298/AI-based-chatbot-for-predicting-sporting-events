import { Composer } from 'grammy';
import { MatchService } from '@/services/matchService';
import { BotContext } from '@/types/context';
import { userMatchesState, showMatchesPage } from './matchHandler';
import { mainKeyboard } from '../keyboards/main.keyboard';
import { createLogger } from '@/utils/logger';

const log = createLogger('handler:league');

export function createLeagueComposer(
  matchService: MatchService
): Composer<BotContext> {
  const composer = new Composer<BotContext>();

  composer.callbackQuery('leagues', async (ctx) => {
    await ctx.editMessageText(ctx.t('league-select'), {
      reply_markup: mainKeyboard,
    });
  });

  composer.callbackQuery(/^league:(.+)$/, async (ctx) => {
    const leagueCode = ctx.match[1];
    const userId = ctx.from.id;

    await ctx.answerCallbackQuery({
      text: ctx.t('loading-matches'),
    });

    try {
      const matches = await matchService.getUpcomingMatches(leagueCode, 14);

      if (matches.length === 0) {
        await ctx.reply(ctx.t('no-upcoming-matches'));
        return;
      }

      userMatchesState.set(userId, {
        matches,
        leagueCode,
        currentPage: 0,
      });

      await showMatchesPage(ctx, userId, 0);
    } catch (error) {
      log.error({ leagueCode, err: error }, 'failed to fetch matches');
      await ctx.reply(ctx.t('error-fetching-matches'));
    }
  });

  composer.callbackQuery('back:main', async (ctx) => {
    await ctx.answerCallbackQuery();

    await ctx.reply(ctx.t('league-select'), {
      reply_markup: mainKeyboard,
    });
  });

  return composer;
}
