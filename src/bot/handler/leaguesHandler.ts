import { Bot, InlineKeyboard } from 'grammy';
import { MatchService } from '@/services/matchService';

const MATCHES_PER_PAGE = 6;

// Храним состояние пользователя (в реальном проекте лучше использовать sessions)
const userState = new Map<
  number,
  {
    matches: any[];
    leagueCode: string;
    currentPage: number;
  }
>();

export function registerLeaguesHandler(bot: Bot, matchService: MatchService) {
  // Обработка выбора лиги
  bot.on('callback_query:data', async (ctx) => {
    const data = ctx.callbackQuery.data;
    const userId = ctx.from!.id;

    // ============================================
    // Выбор лиги
    // ============================================
    if (data.startsWith('league:')) {
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

        // Сохраняем состояние пользователя
        userState.set(userId, {
          matches,
          leagueCode,
          currentPage: 0,
        });

        // Показываем первую страницу
        await showMatchesPage(ctx, userId, 0);
      } catch (error) {
        console.error('Error fetching matches:', error);
        await ctx.reply('Произошла ошибка при загрузке матчей 😔');
      }
    }

    // ============================================
    // Пагинация - следующая страница
    // ============================================
    if (data.startsWith('page:next:')) {
      const leagueCode = data.split(':')[2];
      const state = userState.get(userId);

      if (!state) {
        await ctx.answerCallbackQuery({
          text: 'Сессия истекла, выбери лигу заново',
          show_alert: true,
        });
        return;
      }

      await ctx.answerCallbackQuery();

      const nextPage = state.currentPage + 1;
      state.currentPage = nextPage;

      await showMatchesPage(ctx, userId, nextPage);
    }

    // ============================================
    // Пагинация - предыдущая страница
    // ============================================
    if (data.startsWith('page:prev:')) {
      const state = userState.get(userId);

      if (!state) {
        await ctx.answerCallbackQuery({
          text: 'Сессия истекла, выбери лигу заново',
          show_alert: true,
        });
        return;
      }

      await ctx.answerCallbackQuery();

      const prevPage = state.currentPage - 1;
      state.currentPage = prevPage;

      await showMatchesPage(ctx, userId, prevPage);
    }

    // ============================================
    // Выбор конкретного матча по номеру
    // ============================================
    if (data.startsWith('match:')) {
      const matchIndex = parseInt(data.split(':')[1]);
      const state = userState.get(userId);

      if (!state) {
        await ctx.answerCallbackQuery({
          text: 'Сессия истекла, выбери лигу заново',
          show_alert: true,
        });
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

        const date = matchDetails.date.toLocaleDateString('ru-RU', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });
        const time = matchDetails.date.toLocaleTimeString('ru-RU', {
          hour: '2-digit',
          minute: '2-digit',
        });

        let message = `🏟️ **${matchDetails.homeTeam}** vs **${matchDetails.awayTeam}**\n\n`;
        message += `📅 ${date}\n`;
        message += `⏰ ${time}\n`;
        message += `🔴 Статус: ${matchDetails.status}\n\n`;

        if (
          matchDetails.score.home !== null &&
          matchDetails.score.away !== null
        ) {
          message += `⚽ Счет: **${matchDetails.score.home} - ${matchDetails.score.away}**\n`;
        } else {
          message += `⚽ Матч еще не начался\n`;
        }

        const keyboard = new InlineKeyboard()
          .text('📊 Статистика команд', `stats:${match.id}`)
          .row()
          .text('🎯 Получить AI прогноз', `predict:${match.id}`)
          .row()
          .text('◀️ К списку матчей', `back:matches:${state.leagueCode}`);

        await ctx.reply(message, {
          reply_markup: keyboard,
          parse_mode: 'Markdown',
        });
      } catch (error) {
        console.error('Error fetching match details:', error);
        await ctx.reply('Произошла ошибка при загрузке деталей 😔');
      }
    }

    // ============================================
    // Возврат к списку матчей
    // ============================================
    if (data.startsWith('back:matches:')) {
      const state = userState.get(userId);

      if (!state) {
        await ctx.answerCallbackQuery({
          text: 'Сессия истекла, выбери лигу заново',
          show_alert: true,
        });
        return;
      }

      await ctx.answerCallbackQuery();
      await showMatchesPage(ctx, userId, state.currentPage);
    }

    // ============================================
    // Возврат к выбору лиги
    // ============================================
    if (data === 'back:main') {
      await ctx.answerCallbackQuery();

      const { mainKeyboard } = await import('../keyboards/main.keyboard');

      await ctx.reply('Выбери лигу:', {
        reply_markup: mainKeyboard,
      });
    }

    // ============================================
    // Статистика команд
    // ============================================
    if (data.startsWith('stats:')) {
      const matchId = parseInt(data.split(':')[1]);

      await ctx.answerCallbackQuery({
        text: 'Загружаю статистику...',
      });

      try {
        // Получаем детали матча
        const matchDetails = await matchService.getMatchDetails(matchId);

        const homeTeamId = await getTeamIdByName(
          matchDetails.homeTeam,
          matchService,
          userId // ← Добавь userId
        );
        const awayTeamId = await getTeamIdByName(
          matchDetails.awayTeam,
          matchService,
          userId // ← Добавь userId
        );

        if (!homeTeamId || !awayTeamId) {
          await ctx.reply('Не удалось загрузить статистику команд 😔');
          return;
        }

        const homeTeamMatches = await matchService.getTeamLastMatches(
          homeTeamId,
          5
        );
        const awayTeamMatches = await matchService.getTeamLastMatches(
          awayTeamId,
          5
        );

        // Форматируем сообщение
        let message = `📊 **Статистика матча**\n\n`;
        message += `🏟️ ${matchDetails.homeTeam} vs ${matchDetails.awayTeam}\n`;
        message += `📅 ${matchDetails.date.toLocaleDateString('ru-RU')}\n\n`;

        // Статистика домашней команды
        message += `🏠 **${matchDetails.homeTeam.toUpperCase()}** (домашняя)\n`;
        message += `━━━━━━━━━━━━━━━━━━━━━━\n`;
        message += `📈 Последние 5 матчей:\n`;

        homeTeamMatches.forEach((match) => {
          const isHome = match.homeTeam === matchDetails.homeTeam;
          const teamScore = isHome ? match.score.home : match.score.away;
          const opponentScore = isHome ? match.score.away : match.score.home;
          const opponent = isHome ? match.awayTeam : match.homeTeam;

          let result = '';
          if (teamScore! > opponentScore!)
            result = '✅'; // Победа
          else if (teamScore! < opponentScore!)
            result = '❌'; // Поражение
          else result = '🟰'; // Ничья

          message += `   ${result} ${match.homeTeam} ${match.score.home}-${match.score.away} ${match.awayTeam}\n`;
        });

        const homeStats = calculateStats(
          homeTeamMatches,
          matchDetails.homeTeam
        );
        message += `\n🔥 Форма: ${homeStats.form}\n`;
        message += `⚽ Забито: ${homeStats.goalsFor} (${homeStats.avgGoalsFor} в среднем)\n`;
        message += `🥅 Пропущено: ${homeStats.goalsAgainst} (${homeStats.avgGoalsAgainst} в среднем)\n\n`;

        // Статистика гостевой команды
        message += `✈️ **${matchDetails.awayTeam.toUpperCase()}** (гостевая)\n`;
        message += `━━━━━━━━━━━━━━━━━━━━━━\n`;
        message += `📈 Последние 5 матчей:\n`;

        awayTeamMatches.forEach((match) => {
          const isHome = match.homeTeam === matchDetails.awayTeam;
          const teamScore = isHome ? match.score.home : match.score.away;
          const opponentScore = isHome ? match.score.away : match.score.home;

          let result = '';
          if (teamScore! > opponentScore!) result = '✅';
          else if (teamScore! < opponentScore!) result = '❌';
          else result = '🟰';

          message += `   ${result} ${match.homeTeam} ${match.score.home}-${match.score.away} ${match.awayTeam}\n`;
        });

        const awayStats = calculateStats(
          awayTeamMatches,
          matchDetails.awayTeam
        );
        message += `\n⚠️ Форма: ${awayStats.form}\n`;
        message += `⚽ Забито: ${awayStats.goalsFor} (${awayStats.avgGoalsFor} в среднем)\n`;
        message += `🥅 Пропущено: ${awayStats.goalsAgainst} (${awayStats.avgGoalsAgainst} в среднем)\n`;

        const keyboard = new InlineKeyboard()
          .text('🎯 Получить AI прогноз', `predict:${matchId}`)
          .row()
          .text(
            '◀️ Назад к матчу',
            `match:${getMatchIndexById(userId, matchId)}`
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
    // Прогноз (заглушка)
    // ============================================
    if (data.startsWith('predict:')) {
      await ctx.answerCallbackQuery({
        text: 'AI прогноз скоро будет доступен! 🎯',
        show_alert: true,
      });
    }
  });
}

// ============================================
// Вспомогательные функции
// ============================================

// Получить ID команды по названию (через API)
async function getTeamIdByName(
  teamName: string,
  matchService: MatchService,
  userId: number
): Promise<number | null> {
  const state = userState.get(userId);
  if (!state) return null;

  const match = state.matches.find(
    (m: any) => m.homeTeam === teamName || m.awayTeam === teamName
  );

  if (!match) return null;

  return match.homeTeam === teamName ? match.homeTeamId : match.awayTeamId;
}

// Вычислить статистику команды
function calculateStats(matches: any[], teamName: string) {
  let wins = 0;
  let draws = 0;
  let losses = 0;
  let goalsFor = 0;
  let goalsAgainst = 0;
  const formArray: string[] = [];

  matches.forEach((match) => {
    const isHome = match.homeTeam === teamName;
    const teamScore = isHome ? match.score.home! : match.score.away!;
    const opponentScore = isHome ? match.score.away! : match.score.home!;

    goalsFor += teamScore;
    goalsAgainst += opponentScore;

    if (teamScore > opponentScore) {
      wins++;
      formArray.push('W');
    } else if (teamScore < opponentScore) {
      losses++;
      formArray.push('L');
    } else {
      draws++;
      formArray.push('D');
    }
  });

  return {
    wins,
    draws,
    losses,
    goalsFor,
    goalsAgainst,
    avgGoalsFor: (goalsFor / matches.length).toFixed(1),
    avgGoalsAgainst: (goalsAgainst / matches.length).toFixed(1),
    form: formArray.join('-'),
  };
}

// Найти индекс матча по ID
function getMatchIndexById(userId: number, matchId: number): number {
  const state = userState.get(userId);
  if (!state) return 0;

  return state.matches.findIndex((m) => m.id === matchId);
}

async function showMatchesPage(ctx: any, userId: number, page: number) {
  const state = userState.get(userId);

  if (!state) {
    return;
  }

  const { matches, leagueCode } = state;

  const startIdx = page * MATCHES_PER_PAGE;
  const endIdx = Math.min(startIdx + MATCHES_PER_PAGE, matches.length);
  const pageMatches = matches.slice(startIdx, endIdx);

  const totalPages = Math.ceil(matches.length / MATCHES_PER_PAGE);

  // Формируем сообщение
  let message = `⚽ **Предстоящие матчи** (стр. ${page + 1}/${totalPages})\n\n`;

  // Группируем по датам
  const matchesByDate = new Map<string, typeof pageMatches>();

  pageMatches.forEach((match, idx) => {
    const globalIdx = startIdx + idx;
    const dateKey = match.date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    if (!matchesByDate.has(dateKey)) {
      matchesByDate.set(dateKey, []);
    }
    matchesByDate.get(dateKey)!.push({ ...match, displayIndex: globalIdx });
  });

  // Выводим матчи по датам
  for (const [date, dayMatches] of matchesByDate) {
    message += `📅 **${date}**\n`;

    dayMatches.forEach((match: any) => {
      const time = match.date.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
      });

      message += `${match.displayIndex + 1}. ${match.homeTeam} vs ${match.awayTeam} (${time})\n`;
    });

    message += '\n';
  }

  message += `💡 Нажми на номер матча для деталей`;

  // Создаем клавиатуру
  const keyboard = new InlineKeyboard();

  // Кнопки с номерами матчей (по 3 в ряд)
  pageMatches.forEach((_, idx) => {
    const globalIdx = startIdx + idx;
    keyboard.text(`${globalIdx + 1}`, `match:${globalIdx}`);

    // Перенос строки после каждых 3 кнопок
    if ((idx + 1) % 3 === 0) {
      keyboard.row();
    }
  });

  // Если последний ряд неполный, переносим
  if (pageMatches.length % 3 !== 0) {
    keyboard.row();
  }

  // Кнопки навигации
  const navButtons: Array<{ text: string; callback: string }> = [];

  if (page > 0) {
    navButtons.push({
      text: '◀️ Предыдущие',
      callback: `page:prev:${leagueCode}`,
    });
  }

  if (page < totalPages - 1) {
    navButtons.push({
      text: 'Следующие ▶️',
      callback: `page:next:${leagueCode}`,
    });
  }

  // Добавляем кнопки навигации
  if (navButtons.length > 0) {
    navButtons.forEach((btn) => keyboard.text(btn.text, btn.callback));
    keyboard.row();
  }

  // Кнопка "Назад к лигам"
  keyboard.text('◀️ К лигам', 'back:main');

  // Отправляем или редактируем сообщение
  try {
    await ctx.editMessageText(message, {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    });
  } catch {
    // Если не получилось отредактировать, отправляем новое
    await ctx.reply(message, {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    });
  }
}
