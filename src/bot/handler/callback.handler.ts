import { Bot } from 'grammy';
import { MatchService } from '@/services/matchService';
import { userMatchesState, showMatchesPage } from './matchesHandler';
import { mainKeyboard } from '../keyboards/main.keyboard';
import {
  formatDate,
  formatTime,
  formatMatchResult,
  getResultEmoji,
} from '../utils/formatters';
import {
  calculateTeamStats,
  filterHomeMatches,
  filterAwayMatches,
} from '../utils/statsCalculator';
import { InlineKeyboard } from 'grammy';

export function registerCallbackHandler(bot: Bot, matchService: MatchService) {
  bot.on('callback_query:data', async (ctx) => {
    const data = ctx.callbackQuery.data;
    const userId = ctx.from!.id;

    // ============================================
    // РОУТИНГ ПО ТИПУ CALLBACK
    // ============================================

    // Выбор лиги
    if (data.startsWith('league:')) {
      await handleLeagueSelection(ctx, data, userId, matchService);
      return;
    }

    // Пагинация - следующая страница
    if (data.startsWith('page:next:')) {
      await handleNextPage(ctx, userId);
      return;
    }

    // Пагинация - предыдущая страница
    if (data.startsWith('page:prev:')) {
      await handlePrevPage(ctx, userId);
      return;
    }

    // Выбор конкретного матча
    if (data.startsWith('match:')) {
      await handleMatchSelection(ctx, data, userId, matchService);
      return;
    }

    if (data.startsWith('standings:')) {
      await handleStandings(ctx, data, matchService);
      return;
    }

    // Статистика - базовая
    if (data.startsWith('stats:basic:')) {
      await handleBasicStats(ctx, data, userId, matchService);
      return;
    }

    // Статистика - домашняя
    if (data.startsWith('stats:home:')) {
      await handleHomeStats(ctx, data, userId, matchService);
      return;
    }

    // Статистика - выездная
    if (data.startsWith('stats:away:')) {
      await handleAwayStats(ctx, data, userId, matchService);
      return;
    }

    // Статистика - история встреч
    if (data.startsWith('stats:h2h:')) {
      await handleHeadToHead(ctx, data, userId, matchService);
      return;
    }

    // Статистика - развернутая (заглушка)
    if (data.startsWith('stats:full:')) {
      await ctx.answerCallbackQuery({
        text: 'Развернутая статистика скоро будет доступна! 📊',
        show_alert: true,
      });
      return;
    }

    // Прогноз (заглушка)
    if (data.startsWith('predict:')) {
      await ctx.answerCallbackQuery({
        text: 'AI прогноз скоро будет доступен! 🎯',
        show_alert: true,
      });
      return;
    }

    // Возврат к списку матчей
    if (data.startsWith('back:matches:')) {
      await handleBackToMatches(ctx, userId);
      return;
    }

    // ============================================
    // Показать турнирную таблицу
    // ============================================
    async function handleStandings(
      ctx: any,
      data: string,
      matchService: MatchService
    ) {
      const leagueCode = data.split(':')[1];

      await ctx.answerCallbackQuery({
        text: 'Загружаю таблицу...',
      });

      try {
        const standings = await matchService.getStandings(leagueCode);

        const mainStanding = standings.standings[0];

        if (!mainStanding || mainStanding.table.length === 0) {
          await ctx.reply('Турнирная таблица не найдена 😔');
          return;
        }

        let message = `🏆 **${standings.competition.name}** `;
        message += `Сезон ${standings.season.startDate.substring(0, 4)}/${standings.season.endDate.substring(0, 4)}\n\n`;

        const topTeams = mainStanding.table.slice(0, 20);

        topTeams.forEach((entry) => {
          let positionEmoji = `${entry.position}.`;
          if (entry.position === 1) positionEmoji = '🥇';
          else if (entry.position === 2) positionEmoji = '🥈';
          else if (entry.position === 3) positionEmoji = '🥉';

          const formStr = entry.form
            ? entry.form
                .split(',')
                .map((result) => {
                  if (result === 'W') return '✅';
                  if (result === 'D') return '🟰';
                  if (result === 'L') return '❌';
                  return '';
                })
                .join('')
            : '';

          message += `${positionEmoji} **${entry.team.shortName || entry.team.name}**\n`;
          message += `   📊 ${entry.points} очков | И:${entry.playedGames} В:${entry.won} Н:${entry.draw} П:${entry.lost}`;
          message += ` | ${entry.goalsFor}-${entry.goalsAgainst} (${entry.goalDifference > 0 ? '+' : ''}${entry.goalDifference})`;

          if (formStr) {
            message += `   📈 ${formStr}\n`;
          }

          message += `\n`;
        });

        const keyboard = new InlineKeyboard()
          .text('⚽ К матчам', `back:matches:${leagueCode}`)
          .row()
          .text('◀️ К лигам', 'back:main');

        try {
          await ctx.editMessageText(message, {
            reply_markup: keyboard,
            parse_mode: 'Markdown',
          });
        } catch (error: any) {
          if (error?.description?.includes('message is not modified')) {
            await ctx.answerCallbackQuery();
            return;
          }

          await ctx.reply(message, {
            reply_markup: keyboard,
            parse_mode: 'Markdown',
          });
        }
      } catch (error) {
        console.error('Error fetching standings:', error);
        await ctx.reply('Произошла ошибка при загрузке таблицы 😔');
      }
    }

    if (data === 'back:main') {
      await handleBackToMain(ctx);
      return;
    }
  });
}

// ============================================
// HANDLERS ДЛЯ КАЖДОГО ТИПА CALLBACK
// ============================================

async function handleLeagueSelection(
  ctx: any,
  data: string,
  userId: number,
  matchService: MatchService
) {
  const leagueCode = data.split(':')[1];

  await ctx.answerCallbackQuery({
    text: 'Загружаю матчи...',
  });

  try {
    const matches = await matchService.getUpcomingMatches(leagueCode, 14);

    if (matches.length === 0) {
      await ctx.reply('Предстоящих матчей не найдено 😔');
      return;
    }

    userMatchesState.set(userId, {
      matches,
      leagueCode,
      currentPage: 0,
    });

    await showMatchesPage(ctx, userId, 0);
  } catch (error) {
    console.error('Error fetching matches:', error);
    await ctx.reply('Произошла ошибка при загрузке матчей 😔');
  }
}

async function handleNextPage(ctx: any, userId: number) {
  const state = userMatchesState.get(userId);

  if (!state) {
    await showLeagueSelection(ctx);
    return;
  }

  await ctx.answerCallbackQuery();

  const nextPage = state.currentPage + 1;
  state.currentPage = nextPage;

  await showMatchesPage(ctx, userId, nextPage);
}

async function handlePrevPage(ctx: any, userId: number) {
  const state = userMatchesState.get(userId);

  if (!state) {
    await showLeagueSelection(ctx);
    return;
  }

  await ctx.answerCallbackQuery();

  const prevPage = state.currentPage - 1;
  state.currentPage = prevPage;

  await showMatchesPage(ctx, userId, prevPage);
}

async function handleMatchSelection(
  ctx: any,
  data: string,
  userId: number,
  matchService: MatchService
) {
  const matchIndex = parseInt(data.split(':')[1]);
  const state = userMatchesState.get(userId);

  if (!state) {
    await showLeagueSelection(ctx);
    return;
  }

  await ctx.answerCallbackQuery({
    text: 'Загружаю детали...',
  });

  const match = state.matches[matchIndex];

  if (!match) {
    await ctx.reply('Матч не найден 😔');
    return;
  }

  try {
    const matchDetails = await matchService.getMatchDetails(match.id);

    let message = `🏟️ **${matchDetails.homeTeam}** vs **${matchDetails.awayTeam}**\n\n`;
    message += `📅 ${formatDate(matchDetails.date)}\n`;
    message += `⏰ ${formatTime(matchDetails.date)}\n`;
    message += `🏆 ${matchDetails.competition}\n`;
    message += `🔴 Статус: ${matchDetails.status}\n\n`;

    if (matchDetails.score.home !== null && matchDetails.score.away !== null) {
      message += `⚽ Счет: **${matchDetails.score.home} - ${matchDetails.score.away}**\n`;
    } else {
      message += `⚽ Матч еще не начался\n`;
    }

    const keyboard = new InlineKeyboard()
      .text('📊 Статистика команд', `stats:basic:${match.id}`)
      .row()
      .text('🎯 Получить AI прогноз', `predict:${match.id}`)
      .row()
      .text('◀️ К списку матчей', `back:matches:${state.leagueCode}`);

    await ctx.editMessageText(message, {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    });
  } catch (error) {
    console.error('Error fetching match details:', error);
    await ctx.reply('Произошла ошибка при загрузке деталей 😔');
  }
}

async function handleBasicStats(
  ctx: any,
  data: string,
  userId: number,
  matchService: MatchService
) {
  const matchId = parseInt(data.split(':')[2]);

  await ctx.answerCallbackQuery({
    text: 'Загружаю статистику...',
  });

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

    // Домашняя команда
    message += `🏠 **${matchDetails.homeTeam.toUpperCase()}**\n`;
    message += `━━━━━━━━━━━━━━━━━━━━\n`;
    message += `📈 Последние 5 матчей:\n`;

    homeTeamMatches.forEach((match) => {
      const emoji = getResultEmoji(match, matchDetails.homeTeam);
      message += `${emoji} ${formatMatchResult(match)}\n`;
    });
    message += '\n';

    // Гостевая команда
    message += `✈️ **${matchDetails.awayTeam.toUpperCase()}**\n`;
    message += `━━━━━━━━━━━━━━━━━━━━\n`;
    message += `📈 Последние 5 матчей:\n`;

    awayTeamMatches.forEach((match) => {
      const emoji = getResultEmoji(match, matchDetails.awayTeam);
      message += `${emoji} ${formatMatchResult(match)}\n`;
    });

    const keyboard = createStatsKeyboard(
      matchId,
      getMatchIndex(userId, matchId)
    );

    await ctx.editMessageText(message, {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    });
  } catch (error: any) {
    if (error?.description?.includes('message is not modified')) {
      await ctx.answerCallbackQuery({
        text: 'Вы уже на этой странице статистики',
      });
      return;
    }

    console.error('Error fetching stats:', error);
    await ctx.reply('Произошла ошибка при загрузке статистики 😔');
  }
}

async function handleHomeStats(
  ctx: any,
  data: string,
  userId: number,
  matchService: MatchService
) {
  const matchId = parseInt(data.split(':')[2]);

  await ctx.answerCallbackQuery({
    text: 'Загружаю домашнюю статистику...',
  });

  try {
    const matchDetails = await matchService.getMatchDetails(matchId);

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
      message += `${emoji} ${formatMatchResult(match)}\n`;
    });

    const stats = calculateTeamStats(homeMatches, matchDetails.homeTeam);
    message += `\n🔥 Форма дома: ${stats.form}\n`;
    message += `⚽ Забито дома: ${stats.goalsFor} (${stats.avgGoalsFor} в среднем)\n`;
    message += `🥅 Пропущено дома: ${stats.goalsAgainst} (${stats.avgGoalsAgainst} в среднем)\n`;
    message += `🏆 Побед: ${stats.wins} | Ничьих: ${stats.draws} | Поражений: ${stats.losses}`;

    const keyboard = createStatsKeyboard(
      matchId,
      getMatchIndex(userId, matchId)
    );

    await ctx.editMessageText(message, {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    });
  } catch (error: any) {
    if (error?.description?.includes('message is not modified')) {
      await ctx.answerCallbackQuery({
        text: 'Вы уже на этой странице статистики',
      });
      return;
    }

    console.error('Error fetching home stats:', error);
    await ctx.reply('Произошла ошибка при загрузке статистики 😔');
  }
}

async function handleAwayStats(
  ctx: any,
  data: string,
  userId: number,
  matchService: MatchService
) {
  const matchId = parseInt(data.split(':')[2]);

  await ctx.answerCallbackQuery({
    text: 'Загружаю выездную статистику...',
  });

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
      message += `${emoji} ${formatMatchResult(match)}\n`;
    });

    const stats = calculateTeamStats(awayMatches, matchDetails.awayTeam);
    message += `\n⚠️ Форма на выезде: ${stats.form}\n`;
    message += `⚽ Забито на выезде: ${stats.goalsFor} (${stats.avgGoalsFor} в среднем)\n`;
    message += `🥅 Пропущено на выезде: ${stats.goalsAgainst} (${stats.avgGoalsAgainst} в среднем)\n`;
    message += `🏆 Побед: ${stats.wins} | Ничьих: ${stats.draws} | Поражений: ${stats.losses}`;

    const keyboard = createStatsKeyboard(
      matchId,
      getMatchIndex(userId, matchId)
    );

    await ctx.editMessageText(message, {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    });
  } catch (error: any) {
    if (error?.description?.includes('message is not modified')) {
      await ctx.answerCallbackQuery({
        text: 'Вы уже на этой странице статистики',
      });
      return;
    }

    console.error('Error fetching away stats:', error);
    await ctx.reply('Произошла ошибка при загрузке статистики 😔');
  }
}

async function handleBackToMatches(ctx: any, userId: number) {
  const state = userMatchesState.get(userId);

  if (!state) {
    await showLeagueSelection(ctx);
    return;
  }

  await ctx.answerCallbackQuery();
  await showMatchesPage(ctx, userId, state.currentPage);
}

async function handleBackToMain(ctx: any) {
  await ctx.answerCallbackQuery();

  await ctx.reply('Выбери лигу:', {
    reply_markup: mainKeyboard,
  });
}

async function handleHeadToHead(
  ctx: any,
  data: string,
  userId: number,
  matchService: MatchService
) {
  const matchId = parseInt(data.split(':')[2]);

  await ctx.answerCallbackQuery({
    text: 'Загружаю историю встреч...',
  });

  try {
    const matchDetails = await matchService.getMatchDetails(matchId);

    // Получаем историю встреч
    const h2hMatches = await matchService.getHeadToHead(matchId, 50);

    if (h2hMatches.length === 0) {
      await ctx.reply(
        'История встреч между этими командами не найдена 😔\n\nВозможно, они еще не играли друг против друга недавно.'
      );
      return;
    }
    const matchesToShow = h2hMatches.slice(0, 5);

    let message = `📜 **История встреч**\n\n`;
    message += `🏟️ ${matchDetails.homeTeam} vs ${matchDetails.awayTeam}\n\n`;
    message += `📈 Последние ${matchesToShow.length} матчей:\n\n`;

    // Статистика побед
    let homeWins = 0;
    let draws = 0;
    let awayWins = 0;

    matchesToShow.forEach((match, index) => {
      const date = formatDate(match.date);
      const isHomeTeamHome = match.homeTeam === matchDetails.homeTeam;

      let emoji = '';
      if (match.score.home! > match.score.away!) {
        emoji = isHomeTeamHome ? '✅' : '❌';
        if (isHomeTeamHome) homeWins++;
        else awayWins++;
      } else if (match.score.home! < match.score.away!) {
        emoji = isHomeTeamHome ? '❌' : '✅';
        if (isHomeTeamHome) awayWins++;
        else homeWins++;
      } else {
        emoji = '🟰';
        draws++;
      }

      message += `${index + 1}. ${emoji} ${formatMatchResult(match)}\n`;
      message += `   📅 ${date} | 🏆 ${match.competition}\n\n`;
    });

    // Итоговая статистика
    message += `━━━━━━━━━━━━━━━━━━━━\n`;
    message += `📊 **Статистика:**\n`;
    message += `🏠 ${matchDetails.homeTeam}: ${homeWins} побед\n`;
    message += `🟰 Ничьи: ${draws}\n`;
    message += `✈️ ${matchDetails.awayTeam}: ${awayWins} побед\n\n`;

    // Дополнительная статистика
    const totalGoals = matchesToShow.reduce(
      (sum, match) => sum + (match.score.home || 0) + (match.score.away || 0),
      0
    );
    const avgGoals = (totalGoals / matchesToShow.length).toFixed(1);

    message += `⚽ Среднее голов за матч: ${avgGoals}\n`;

    // Определяем тренд
    const lastThree = matchesToShow.slice(0, 3);
    const homeWinsLastThree = lastThree.filter((m) => {
      const isHomeTeamHome = m.homeTeam === matchDetails.homeTeam;
      return (
        (isHomeTeamHome && m.score.home! > m.score.away!) ||
        (!isHomeTeamHome && m.score.away! > m.score.home!)
      );
    }).length;

    if (homeWinsLastThree >= 2) {
      message += `\n🔥 ${matchDetails.homeTeam} выигрывает ${homeWinsLastThree} из последних 3 встреч`;
    } else if (homeWinsLastThree === 0) {
      message += `\n🔥 ${matchDetails.awayTeam} не проигрывает в последних 3 встречах`;
    }

    const keyboard = createStatsKeyboard(
      matchId,
      getMatchIndex(userId, matchId)
    );

    try {
      await ctx.editMessageText(message, {
        reply_markup: keyboard,
        parse_mode: 'Markdown',
      });
    } catch (error: any) {
      if (error?.description?.includes('message is not modified')) {
        await ctx.answerCallbackQuery();
        return;
      }

      await ctx.reply(message, {
        reply_markup: keyboard,
        parse_mode: 'Markdown',
      });
    }
  } catch (error) {
    console.error('Error fetching head-to-head:', error);
    await ctx.reply('Произошла ошибка при загрузке истории встреч 😔');
  }
}

// ============================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================

function createStatsKeyboard(
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
    .text('📜 История встреч', `stats:h2h:${matchId}`)
    .row()
    .text('📈 Развернутая (скоро)', `stats:full:${matchId}`)
    .row()
    .text('🎯 AI Прогноз', `predict:${matchId}`)
    .row()
    .text('◀️ К матчу', `match:${matchIndex}`);
}

function getMatchIndex(userId: number, matchId: number): number {
  const state = userMatchesState.get(userId);
  if (!state) return 0;
  return state.matches.findIndex((m: any) => m.id === matchId);
}

async function showLeagueSelection(ctx: any) {
  await ctx.answerCallbackQuery({
    text: 'Сессия истекла, показываю лиги',
  });

  await ctx.reply('⚽ Выбери лигу:', {
    reply_markup: mainKeyboard,
  });
}
