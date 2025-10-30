import { Bot, InlineKeyboard } from 'grammy';
import { MatchService } from '@/services/matchService';
import {
  formatMatchResult,
  getResultEmoji,
  formatDate,
} from '../utils/formatters';
import {
  calculateTeamStats,
  filterHomeMatches,
  filterAwayMatches,
} from '../utils/statsCalculator';
import { userMatchesState } from './matchesHandler';

export function registerStatsHandler(bot: Bot, matchService: MatchService) {
  bot.on('callback_query:data', async (ctx) => {
    const data = ctx.callbackQuery.data;
    const userId = ctx.from!.id;

    // ============================================
    // Базовая статистика (последние матчи)
    // ============================================
    if (data.startsWith('stats:basic:')) {
      const matchId = parseInt(data.split(':')[2]);

      await ctx.answerCallbackQuery({
        text: 'Загружаю статистику...',
      });

      await showBasicStats(ctx, matchService, matchId, userId);
    }

    // ============================================
    // Домашняя статистика домашней команды
    // ============================================
    if (data.startsWith('stats:home:')) {
      const matchId = parseInt(data.split(':')[2]);

      await ctx.answerCallbackQuery({
        text: 'Загружаю домашнюю статистику...',
      });

      await showHomeStats(ctx, matchService, matchId, userId);
    }

    // ============================================
    // Выездная статистика выездной команды
    // ============================================
    if (data.startsWith('stats:away:')) {
      const matchId = parseInt(data.split(':')[2]);

      await ctx.answerCallbackQuery({
        text: 'Загружаю выездную статистику...',
      });

      await showAwayStats(ctx, matchService, matchId, userId);
    }

    // ============================================
    // Развернутая статистика (будущее)
    // ============================================
    if (data.startsWith('stats:full:')) {
      await ctx.answerCallbackQuery({
        text: 'Развернутая статистика скоро будет доступна! 📊',
        show_alert: true,
      });
    }

    // ============================================
    // Возврат к деталям матча
    // ============================================
    if (data.startsWith('back:match:')) {
      const matchIndex = parseInt(data.split(':')[2]);

      await ctx.answerCallbackQuery();

      // Вызываем handler деталей матча
      ctx.callbackQuery.data = `match:${matchIndex}`;
      // Триггерим заново обработку
    }
  });
}

// ============================================
// Базовая статистика - последние 5 матчей
// ============================================
async function showBasicStats(
  ctx: any,
  matchService: MatchService,
  matchId: number,
  userId: number
) {
  try {
    const matchDetails = await matchService.getMatchDetails(matchId);

    const homeTeamMatches = await matchService.getTeamLastMatches(
      matchDetails.homeTeamId,
      5
    );
    const awayTeamMatches = await matchService.getTeamLastMatches(
      matchDetails.awayTeamId,
      5
    );

    let message = `📊 **Статистика: Последние матчи**\n\n`;
    message += `🏟️ ${matchDetails.homeTeam} vs ${matchDetails.awayTeam}\n`;
    message += `📅 ${formatDate(matchDetails.date)}\n\n`;

    // Домашняя команда
    message += `🏠 **${matchDetails.homeTeam.toUpperCase()}**\n`;
    message += `━━━━━━━━━━━━━━━━━━━━\n`;
    message += `📈 Последние 5 матчей:\n`;

    homeTeamMatches.forEach((match) => {
      const emoji = getResultEmoji(match, matchDetails.homeTeam);
      message += `   ${emoji} ${formatMatchResult(match)}\n`;
    });

    const homeStats = calculateTeamStats(
      homeTeamMatches,
      matchDetails.homeTeam
    );
    message += `\n🔥 Форма: ${homeStats.form}\n`;
    message += `⚽ Забито: ${homeStats.goalsFor} (${homeStats.avgGoalsFor} в среднем)\n`;
    message += `🥅 Пропущено: ${homeStats.goalsAgainst} (${homeStats.avgGoalsAgainst} в среднем)\n\n`;

    // Гостевая команда
    message += `✈️ **${matchDetails.awayTeam.toUpperCase()}**\n`;
    message += `━━━━━━━━━━━━━━━━━━━━\n`;
    message += `📈 Последние 5 матчей:\n`;

    awayTeamMatches.forEach((match) => {
      const emoji = getResultEmoji(match, matchDetails.awayTeam);
      message += `   ${emoji} ${formatMatchResult(match)}\n`;
    });

    const awayStats = calculateTeamStats(
      awayTeamMatches,
      matchDetails.awayTeam
    );
    message += `\n⚠️ Форма: ${awayStats.form}\n`;
    message += `⚽ Забито: ${awayStats.goalsFor} (${awayStats.avgGoalsFor} в среднем)\n`;
    message += `🥅 Пропущено: ${awayStats.goalsAgainst} (${awayStats.avgGoalsAgainst} в среднем)`;

    const keyboard = createStatisticssKeyboard(
      matchId,
      getMatchIndex(userId, matchId)
    );

    await ctx.reply(message, {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    await ctx.reply('Произошла ошибка при загрузке статистики 😔');
  }
}

// ============================================
// Домашняя статистика домашней команды
// ============================================
async function showHomeStats(
  ctx: any,
  matchService: MatchService,
  matchId: number,
  userId: number
) {
  try {
    const matchDetails = await matchService.getMatchDetails(matchId);

    // Получаем последние 10 матчей чтобы отфильтровать домашние
    const allMatches = await matchService.getTeamLastMatches(
      matchDetails.homeTeamId,
      10
    );

    const homeMatches = filterHomeMatches(
      allMatches,
      matchDetails.homeTeam
    ).slice(0, 5);

    let message = `🏠 **Домашняя статистика: ${matchDetails.homeTeam}**\n\n`;
    message += `📈 Последние 5 домашних матчей:\n`;

    homeMatches.forEach((match) => {
      const emoji = getResultEmoji(match, matchDetails.homeTeam);
      message += `   ${emoji} ${formatMatchResult(match)}\n`;
    });

    const stats = calculateTeamStats(homeMatches, matchDetails.homeTeam);
    message += `\n🔥 Форма дома: ${stats.form}\n`;
    message += `⚽ Забито дома: ${stats.goalsFor} (${stats.avgGoalsFor} в среднем)\n`;
    message += `🥅 Пропущено дома: ${stats.goalsAgainst} (${stats.avgGoalsAgainst} в среднем)\n`;
    message += `🏆 Побед: ${stats.wins} | Ничьих: ${stats.draws} | Поражений: ${stats.losses}`;

    const keyboard = createStatisticssKeyboard(
      matchId,
      getMatchIndex(userId, matchId)
    );

    await ctx.reply(message, {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    });
  } catch (error) {
    console.error('Error fetching home stats:', error);
    await ctx.reply('Произошла ошибка при загрузке статистики 😔');
  }
}

// ============================================
// Выездная статистика выездной команды
// ============================================
async function showAwayStats(
  ctx: any,
  matchService: MatchService,
  matchId: number,
  userId: number
) {
  try {
    const matchDetails = await matchService.getMatchDetails(matchId);

    const allMatches = await matchService.getTeamLastMatches(
      matchDetails.awayTeamId,
      10
    );

    const awayMatches = filterAwayMatches(
      allMatches,
      matchDetails.awayTeam
    ).slice(0, 5);

    let message = `✈️ **Выездная статистика: ${matchDetails.awayTeam}**\n\n`;
    message += `📈 Последние 5 выездных матчей:\n`;

    awayMatches.forEach((match) => {
      const emoji = getResultEmoji(match, matchDetails.awayTeam);
      message += `   ${emoji} ${formatMatchResult(match)}\n`;
    });

    const stats = calculateTeamStats(awayMatches, matchDetails.awayTeam);
    message += `\n⚠️ Форма на выезде: ${stats.form}\n`;
    message += `⚽ Забито на выезде: ${stats.goalsFor} (${stats.avgGoalsFor} в среднем)\n`;
    message += `🥅 Пропущено на выезде: ${stats.goalsAgainst} (${stats.avgGoalsAgainst} в среднем)\n`;
    message += `🏆 Побед: ${stats.wins} | Ничьих: ${stats.draws} | Поражений: ${stats.losses}`;

    const keyboard = createStatisticssKeyboard(
      matchId,
      getMatchIndex(userId, matchId)
    );

    await ctx.reply(message, {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    });
  } catch (error) {
    console.error('Error fetching away stats:', error);
    await ctx.reply('Произошла ошибка при загрузке статистики 😔');
  }
}

// ============================================
// Создать клавиатуру для статистики
// ============================================
function createStatisticssKeyboard(
  matchId: number,
  matchIndex: number
): InlineKeyboard {
  return new InlineKeyboard()
    .text('📊 Основная', `stats:basic:${matchId}`)
    .row()
    .text('🏠 Домашняя статистика', `stats:home:${matchId}`)
    .row()
    .text('✈️ Выездная статистика', `stats:away:${matchId}`)
    .row()
    .text('📈 Развернутая (скоро)', `stats:full:${matchId}`)
    .row()
    .text('🎯 AI Прогноз', `predict:${matchId}`)
    .row()
    .text('◀️ К матчу', `match:${matchIndex}`);
}

// Вспомогательная функция
function getMatchIndex(userId: number, matchId: number): number {
  const state = userMatchesState.get(userId);
  if (!state) return 0;
  return state.matches.findIndex((m: any) => m.id === matchId);
}
