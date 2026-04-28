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
    const from = ctx.from!;
    let needsTimezone = true;

    try {
      const user = await db.user.upsert({
        where: { telegramId: BigInt(from.id) },
        update: {
          username: from.username,
          firstName: from.first_name || null,
          lastName: from.last_name || null,
          locale: from.language_code || 'en',
        },
        create: {
          telegramId: BigInt(from.id),
          username: from.username,
          firstName: from.first_name || null,
          lastName: from.last_name || null,
          locale: from.language_code || 'en',
        },
      });
      needsTimezone = !user.timezone;
      log.info({ telegramId: from.id }, 'user registered/updated');
    } catch (error) {
      log.error({ telegramId: from.id, err: error }, 'failed to register user');
    }

    if (needsTimezone) {
      await ctx.reply(ctx.t('start-welcome', { name: from.first_name || 'User' }), {
        parse_mode: 'Markdown',
      });
      await ctx.reply(ctx.t('tz-select'), {
        reply_markup: buildRegionKeyboard(),
      });
    } else {
      await ctx.reply(ctx.t('start-welcome', { name: from.first_name || 'User' }), {
        reply_markup: mainKeyboard,
        parse_mode: 'Markdown',
      });
    }
  });
}
