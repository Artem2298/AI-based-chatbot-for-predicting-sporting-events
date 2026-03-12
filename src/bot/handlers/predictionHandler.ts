import { Composer, InlineKeyboard } from 'grammy';
import { MatchService } from '@/services/matchService';
import { PredictionService } from '@/services/prediction';
import { DbService } from '@/services/dbService';
import { userMatchesState } from './matchHandler';
import {
  formatOutcomePrediction,
  // formatCornersPrediction,
  // formatCardsPrediction,
  // formatOffsidesPrediction,
  formatTotalPrediction,
  formatBttsPrediction,
} from '@/bot/handlers/formatters/predictionFormatter';
import { BotContext } from '@/types/context';
import { createLogger } from '@/utils/logger';

const log = createLogger('handler:prediction');

export function createPredictionComposer(
  matchService: MatchService,
  predictionService: PredictionService
): Composer<BotContext> {
  const composer = new Composer<BotContext>();

  composer.callbackQuery(/^predict:(\d+)$/, async (ctx) => {
    const matchId = parseInt(ctx.match[1]);

    await ctx.answerCallbackQuery();
    try {
      await ctx.editMessageReplyMarkup({ reply_markup: { inline_keyboard: [] } });
    } catch {}

    const t = ctx.t.bind(ctx);
    const message = `
🤖 ${t('predict-title-outcome')}

⚽ ${t('predict-title-outcome')}
⚽ ${t('predict-title-total')}
🤝 ${t('predict-title-btts')}

${t('bet-select')} ⬇️
    `.trim();

    const keyboard = new InlineKeyboard()
      .text(
        `⚽ ${ctx.t('predict-title-outcome').replace(/🤖 AI ПРОГНОЗ: /i, '')}`,
        `predict_type:outcome:${matchId}`
      )
      .row()
      .text(`⚽ ${ctx.t('predict-btn-total')}`, `predict_type:total:${matchId}`)
      .row()
      .text(`🤝 ${ctx.t('predict-btn-btts')}`, `predict_type:btts:${matchId}`)
      .row()
      .text(
        `◀️ ${ctx.t('btn-to-match')}`,
        `match:${getMatchIndex(ctx.from.id, matchId)}`
      );

    await ctx.reply(message, {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    });
  });

  composer.callbackQuery(
    /^predict_type:(outcome|total|btts):(\d+)$/,
    async (ctx) => {
      const type = ctx.match[1] as
        | 'outcome'
        // | 'corners'
        // | 'cards'
        // | 'offsides'
        | 'total'
        | 'btts';
      const matchId = parseInt(ctx.match[2]);

      await ctx.answerCallbackQuery();
      try {
        await ctx.editMessageReplyMarkup({ reply_markup: { inline_keyboard: [] } });
      } catch {}

      try {
        const match = await matchService.getMatchDetails(matchId);

        const typeEmoji = {
          outcome: '⚽',
          total: '⚽',
          btts: '🤝',
        }[type];

        const typeName = ctx
          .t(`predict-title-${type}`)
          .replace(/🤖 AI ПРОГНОЗ: /i, '');

        await ctx.reply(
          `${ctx.t('predict-process')}\n\n` +
            `⚽ ${match.homeTeam} vs ${match.awayTeam}\n` +
            `${typeEmoji} ${typeName}\n\n` +
            `${ctx.t('predict-gathering')}\n` +
            `${ctx.t('predict-analyzing')}\n\n` +
            `${ctx.t('predict-wait')}`,
          { parse_mode: 'Markdown' }
        );

        const gifMsg = await ctx.replyWithAnimation(
          'CgACAgQAAxkBAAIENWmyisd53KHW7UsY5SQ8MljcHhFKAAIoAwACfDlcU1JZFHE_23JcOgQ'
        );

        let dbUserId: number | undefined;
        if (ctx.from) {
          const dbUser = await DbService.getUserByTelegramId(ctx.from.id);
          dbUserId = dbUser?.id;
        }

        const prediction = await predictionService.generatePrediction(
          matchId,
          type,
          ctx.from?.language_code,
          dbUserId
        );

        let message: string;
        const t = ctx.t.bind(ctx);
        switch (prediction.type) {
          case 'outcome':
            message = formatOutcomePrediction(match, prediction, t);
            break;
          // case 'corners':
          //   message = formatCornersPrediction(match, prediction, t);
          //   break;
          // case 'cards':
          //   message = formatCardsPrediction(match, prediction, t);
          //   break;
          // case 'offsides':
          //   message = formatOffsidesPrediction(match, prediction, t);
          //   break;
          case 'total':
            message = formatTotalPrediction(match, prediction, t);
            break;
          case 'btts':
            message = formatBttsPrediction(match, prediction, t);
            break;
          default:
            message = ctx.t('predict-error');
        }

        const keyboard = new InlineKeyboard()
          .text(`🔄 ${ctx.t('btn-refresh')}`, `predict_type:${type}:${matchId}`)
          .row()
          .text(`🤖 ${ctx.t('btn-other-predict')}`, `predict:${matchId}`)
          .row()
          .text(`📊 ${ctx.t('btn-stats')}`, `stats:basic:${matchId}`)
          .row()
          .text(
            `◀️ ${ctx.t('btn-to-match')}`,
            `match:${getMatchIndex(ctx.from.id, matchId)}`
          );

        await ctx.api.deleteMessage(ctx.chat!.id, gifMsg.message_id);
        await ctx.reply(message, {
          reply_markup: keyboard,
          parse_mode: 'Markdown',
        });
      } catch (error) {
        log.error(
          { matchId, type, err: error },
          'failed to generate prediction'
        );

        let errorMessage = ctx.t('predict-error');

        if (error instanceof Error && error.message.includes('Insufficient')) {
          errorMessage +=
            '\n\n' +
            ctx.t('predict-insufficient', {
              type: ctx
                .t(`predict-title-${type}`)
                .replace(/🤖 AI ПРОГНОЗ: /i, '')
                .toLowerCase(),
            });
          errorMessage += '\n\n' + ctx.t('predict-try-other');
        } else {
          errorMessage += '\n\n' + ctx.t('predict-try-later');
        }

        await ctx.reply(errorMessage, {
          reply_markup: new InlineKeyboard()
            .text(ctx.t('btn-other-predict'), `predict:${matchId}`)
            .row()
            .text(
              `◀️ ${ctx.t('btn-to-match')}`,
              `match:${getMatchIndex(ctx.from.id, matchId)}`
            ),
        });
      }
    }
  );

  return composer;
}

function getMatchIndex(userId: number, matchId: number): number {
  const state = userMatchesState.get(userId);
  if (!state) return 0;
  return state.matches.findIndex((m) => m.id === matchId);
}
