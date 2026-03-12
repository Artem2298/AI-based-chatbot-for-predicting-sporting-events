import { Bot } from 'grammy';
import { mainKeyboard } from '../keyboards/main.keyboard';
import { buildRegionKeyboard } from '../keyboards/timezone.keyboard';
import { BotContext } from '@/types/context';
import { db } from '@/services/dbService';
import { createLogger } from '@/utils/logger';

const log = createLogger('handler:start');

export function registerStartHandler(bot: Bot<BotContext>) {
  bot.api.setMyCommands([
    { command: 'start', description: 'Restart bot / Main menu' },
    { command: 'timezone', description: 'Change timezone' },
  ]);

  bot.command('timezone', async (ctx) => {
    await ctx.reply(ctx.t('tz-select'), {
      reply_markup: buildRegionKeyboard(),
    });
  });

  bot.command('start', async (ctx) => {
    let needsTimezone = true;

    if (ctx.from) {
      try {
        const user = await db.user.upsert({
          where: { telegramId: BigInt(ctx.from.id) },
          update: {
            username: ctx.from.username,
            firstName: ctx.from.first_name || null,
            lastName: ctx.from.last_name || null,
            locale: ctx.from.language_code || 'en',
          },
          create: {
            telegramId: BigInt(ctx.from.id),
            username: ctx.from.username,
            firstName: ctx.from.first_name || null,
            lastName: ctx.from.last_name || null,
            locale: ctx.from.language_code || 'en',
          },
        });
        needsTimezone = !user.timezone;
        log.info({ telegramId: ctx.from.id }, 'user registered/updated');
      } catch (error) {
        log.error({ telegramId: ctx.from.id, err: error }, 'failed to register user');
      }
    }

    if (needsTimezone) {
      await ctx.reply(ctx.t('start-welcome', { name: ctx.from?.first_name || 'User' }), {
        parse_mode: 'Markdown',
      });
      await ctx.reply(ctx.t('tz-select'), {
        reply_markup: buildRegionKeyboard(),
      });
    } else {
      await ctx.reply(ctx.t('start-welcome', { name: ctx.from?.first_name || 'User' }), {
        reply_markup: mainKeyboard,
        parse_mode: 'Markdown',
      });
    }
  });
}
