// import { Bot } from 'grammy';
// import { MatchService } from '@/services/matchService';
// import { userMatchesState, showMatchesPage } from './matchesHandler';

// export function registerLeaguesHandler(bot: Bot, matchService: MatchService) {
//   bot.on('callback_query:data', async (ctx) => {
//     const data = ctx.callbackQuery.data;
//     const userId = ctx.from!.id;

//     // ============================================
//     // Выбор лиги
//     // ============================================
//     if (data.startsWith('league:')) {
//       const leagueCode = data.split(':')[1];

//       await ctx.answerCallbackQuery({
//         text: 'Загружаю матчи...',
//       });

//       try {
//         const matches = await matchService.getUpcomingMatches(leagueCode, 14);

//         if (matches.length === 0) {
//           await ctx.reply('Предстоящих матчей не найдено 😔');
//           return;
//         }

//         // Сохраняем состояние пользователя
//         userMatchesState.set(userId, {
//           matches,
//           leagueCode,
//           currentPage: 0,
//         });

//         // Показываем первую страницу
//         await showMatchesPage(ctx, userId, 0);
//       } catch (error) {
//         console.error('Error fetching matches:', error);
//         await ctx.reply('Произошла ошибка при загрузке матчей 😔');
//       }
//     }

//     // ============================================
//     // Возврат к выбору лиги
//     // ============================================
//     if (data === 'back:main') {
//       await ctx.answerCallbackQuery();

//       const { mainKeyboard } = await import('../keyboards/main.keyboard');

//       await ctx.reply('Выбери лигу:', {
//         reply_markup: mainKeyboard,
//       });
//     }
//   });
// }
