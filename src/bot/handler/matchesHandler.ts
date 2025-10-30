import { InlineKeyboard } from 'grammy';
import { formatMatchesList } from '../utils/formatters';
const MATCHES_PER_PAGE = 6;

// Состояние пользователей
export const userMatchesState = new Map<
  number,
  {
    matches: any[];
    leagueCode: string;
    currentPage: number;
  }
>();

// Показать страницу с матчами
export async function showMatchesPage(ctx: any, userId: number, page: number) {
  const state = userMatchesState.get(userId);

  if (!state) {
    return;
  }

  const { matches, leagueCode } = state;

  const startIdx = page * MATCHES_PER_PAGE;
  const endIdx = Math.min(startIdx + MATCHES_PER_PAGE, matches.length);
  const pageMatches = matches.slice(startIdx, endIdx);

  const totalPages = Math.ceil(matches.length / MATCHES_PER_PAGE);

  let message = `⚽ **Предстоящие матчи** (стр. ${page + 1}/${totalPages})\n\n`;
  message += formatMatchesList(pageMatches, startIdx);
  message += `💡 Нажми на номер матча для деталей`;

  const keyboard = new InlineKeyboard();

  pageMatches.forEach((_, idx) => {
    const globalIdx = startIdx + idx;
    keyboard.text(`${globalIdx + 1}`, `match:${globalIdx}`);

    if ((idx + 1) % 3 === 0) {
      keyboard.row();
    }
  });

  if (pageMatches.length % 3 !== 0) {
    keyboard.row();
  }

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

  if (navButtons.length > 0) {
    navButtons.forEach((btn) => keyboard.text(btn.text, btn.callback));
    keyboard.row();
  }

  keyboard.text('📊 Таблица', `standings:${leagueCode}`).row();
  keyboard.text('◀️ К лигам', 'back:main');

  try {
    await ctx.editMessageText(message, {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    });
  } catch {
    await ctx.reply(message, {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    });
  }
}
