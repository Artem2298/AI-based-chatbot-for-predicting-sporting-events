// import { Bot, InlineKeyboard } from 'grammy';
// import { MatchService } from '@/services/matchService';
// import { formatDate, formatTime } from '../utils/formatters';
// import { userMatchesState } from './matchesHandler';

// export function registerMatchDetailsHandler(
//   bot: Bot,
//   matchService: MatchService
// ) {
//   bot.on('callback_query:data', async (ctx) => {
//     const data = ctx.callbackQuery.data;
//     const userId = ctx.from!.id;

//     // ============================================
//     // Выбор конкретного матча по номеру
//     // ============================================
//     if (data.startsWith('match:')) {
//       const matchIndex = parseInt(data.split(':')[1]);
//       const state = userMatchesState.get(userId);

//       if (!state) {
//         await ctx.answerCallbackQuery({
//           text: 'Сессия истекла, выбери лигу заново',
//           show_alert: true,
//         });
//         return;
//       }

//       await ctx.answerCallbackQuery({
//         text: 'Загружаю детали...',
//       });

//       const match = state.matches[matchIndex];

//       if (!match) {
//         await ctx.reply('Матч не найден 😔');
//         return;
//       }

//       try {
//         const matchDetails = await matchService.getMatchDetails(match.id);

//         let message = `🏟️ **${matchDetails.homeTeam}** vs **${matchDetails.awayTeam}**\n\n`;
//         message += `📅 ${formatDate(matchDetails.date)}\n`;
//         message += `⏰ ${formatTime(matchDetails.date)}\n`;
//         message += `🏆 ${matchDetails.competition}\n`;
//         message += `🔴 Статус: ${matchDetails.status}\n\n`;

//         if (
//           matchDetails.score.home !== null &&
//           matchDetails.score.away !== null
//         ) {
//           message += `⚽ Счет: **${matchDetails.score.home} - ${matchDetails.score.away}**\n`;
//         } else {
//           message += `⚽ Матч еще не начался\n`;
//         }

//         const keyboard = new InlineKeyboard()
//           .text('📊 Статистика команд', `stats:basic:${match.id}`)
//           .row()
//           .text('🎯 Получить AI прогноз', `predict:${match.id}`)
//           .row()
//           .text('◀️ К списку матчей', `back:matches:${state.leagueCode}`);

//         await ctx.reply(message, {
//           reply_markup: keyboard,
//           parse_mode: 'Markdown',
//         });
//       } catch (error) {
//         console.error('Error fetching match details:', error);
//         await ctx.reply('Произошла ошибка при загрузке деталей 😔');
//       }
//     }

//     // ============================================
//     // Возврат к списку матчей
//     // ============================================
//     if (data.startsWith('back:matches:')) {
//       const state = userMatchesState.get(userId);

//       if (!state) {
//         await ctx.answerCallbackQuery({
//           text: 'Сессия истекла, выбери лигу заново',
//           show_alert: true,
//         });
//         return;
//       }

//       await ctx.answerCallbackQuery();

//       const { showMatchesPage } = await import('./matchesHandler');
//       await showMatchesPage(ctx, userId, state.currentPage);
//     }
//   });
// }
