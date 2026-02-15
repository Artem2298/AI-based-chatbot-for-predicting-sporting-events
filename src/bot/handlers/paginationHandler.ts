import { Composer } from 'grammy';
import { userMatchesState, showMatchesPage } from './matchHandler';
import { mainKeyboard } from '../keyboards/main.keyboard';
import { BotContext } from '@/types/context';

export function createPaginationComposer(): Composer<BotContext> {
  const composer = new Composer<BotContext>();

  composer.callbackQuery(/^page:next:(.+)$/, async (ctx) => {
    const userId = ctx.from.id;
    const state = userMatchesState.get(userId);

    if (!state) {
      await showLeagueSelection(ctx);
      return;
    }

    await ctx.answerCallbackQuery();

    const nextPage = state.currentPage + 1;
    state.currentPage = nextPage;

    await showMatchesPage(ctx, userId, nextPage);
  });

  composer.callbackQuery(/^page:prev:(.+)$/, async (ctx) => {
    const userId = ctx.from.id;
    const state = userMatchesState.get(userId);

    if (!state) {
      await showLeagueSelection(ctx);
      return;
    }

    await ctx.answerCallbackQuery();

    const prevPage = state.currentPage - 1;
    state.currentPage = prevPage;

    await showMatchesPage(ctx, userId, prevPage);
  });

  return composer;
}

async function showLeagueSelection(ctx: BotContext) {
  await ctx.answerCallbackQuery({
    text: ctx.t('league-error'),
  });

  await ctx.reply(ctx.t('league-select'), {
    reply_markup: mainKeyboard,
  });
}
