import { Composer } from 'grammy';
import { BotContext } from '@/types/context';
import { db } from '@/services/dbService';
import { mainKeyboard } from '../keyboards/main.keyboard';
import { buildRegionKeyboard, buildCityKeyboard } from '../keyboards/timezone.keyboard';
import { createLogger } from '@/utils/logger';

const log = createLogger('handler:timezone');

export function createTimezoneComposer(): Composer<BotContext> {
  const composer = new Composer<BotContext>();

  composer.callbackQuery(/^tz_region:(.+)$/, async (ctx) => {
    const region = ctx.match[1];
    await ctx.answerCallbackQuery();

    if (region === 'back') {
      try {
        await ctx.editMessageText(ctx.t('tz-select'), {
          reply_markup: buildRegionKeyboard(),
        });
      } catch {
        await ctx.reply(ctx.t('tz-select'), {
          reply_markup: buildRegionKeyboard(),
        });
      }
      return;
    }

    try {
      await ctx.editMessageText(ctx.t('tz-select-city'), {
        reply_markup: buildCityKeyboard(region),
      });
    } catch {
      await ctx.reply(ctx.t('tz-select-city'), {
        reply_markup: buildCityKeyboard(region),
      });
    }
  });

  composer.callbackQuery('tz:change', async (ctx) => {
    await ctx.answerCallbackQuery();
    try {
      await ctx.editMessageReplyMarkup({ reply_markup: { inline_keyboard: [] } });
    } catch {}

    await ctx.reply(ctx.t('tz-select'), {
      reply_markup: buildRegionKeyboard(),
    });
  });

  composer.callbackQuery(/^tz:(.+)$/, async (ctx) => {
    const timezone = ctx.match[1];
    await ctx.answerCallbackQuery();

    try {
      await ctx.editMessageReplyMarkup({ reply_markup: { inline_keyboard: [] } });
    } catch {}

    if (ctx.from) {
      try {
        await db.user.update({
          where: { telegramId: BigInt(ctx.from.id) },
          data: { timezone },
        });
        log.info({ telegramId: ctx.from.id, timezone }, 'user timezone saved');
      } catch (error) {
        log.error({ telegramId: ctx.from.id, err: error }, 'failed to save timezone');
      }
    }

    const cityName = timezone.split('/').pop()?.replace(/_/g, ' ') || timezone;
    await ctx.reply(ctx.t('tz-saved', { city: cityName }), {
      reply_markup: mainKeyboard,
      parse_mode: 'Markdown',
    });
  });

  return composer;
}
