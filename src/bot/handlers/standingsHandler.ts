import { Composer, InlineKeyboard } from 'grammy';
import { MatchService } from '@/services/matchService';
import { BotContext } from '@/types/context';
import { createLogger } from '@/utils/logger';
import { getLeagueFlag } from '../utils/formatters';

const log = createLogger('handler:standings');

export function createStandingsComposer(
  matchService: MatchService
): Composer<BotContext> {
  const composer = new Composer<BotContext>();

  composer.callbackQuery(/^standings:(.+)$/, async (ctx) => {
    const leagueCode = ctx.match[1];

    await ctx.answerCallbackQuery({
      text: ctx.t('standings-loading'),
    });

    try {
      const standings = await matchService.getStandings(leagueCode);

      const mainStanding = standings.standings[0];

      if (!mainStanding || mainStanding.table.length === 0) {
        await ctx.reply(ctx.t('standings-not-found'));
        return;
      }

      let message = `${getLeagueFlag(leagueCode)} ${ctx.t('standings-title', { league: standings.competition.name })}\n`;
      message += `${ctx.t('standings-season', {
        start: standings.season.startDate.substring(0, 4),
        end: standings.season.endDate.substring(0, 4),
      })}\n\n`;

      message += `   📊 ${ctx.t('standings-points')}  |  ${ctx.t('standings-header-form')}  |  ${ctx.t('standings-header-goals')}  |  ${ctx.t('standings-header-gd')}\n\n`;

      const topTeams = mainStanding.table.slice(0, 20);

      topTeams.forEach((entry) => {
        let positionEmoji = `${entry.position}.`;
        if (entry.position === 1) positionEmoji = '🥇';
        else if (entry.position === 2) positionEmoji = '🥈';
        else if (entry.position === 3) positionEmoji = '🥉';

        message += `${positionEmoji} ${entry.team.shortName || entry.team.name}\n`;
        message += `   📊 ${entry.points} ${ctx.t('standings-points')} | ${ctx.t(
          'standings-stats-short',
          {
            played: entry.playedGames,
            won: entry.won,
            draw: entry.draw,
            lost: entry.lost,
          }
        )}`;
        message += ` | ${entry.goalsFor}-${entry.goalsAgainst} (${entry.goalDifference > 0 ? '+' : ''}${entry.goalDifference})`;

        message += `\n`;
      });

      const keyboard = new InlineKeyboard()
        .text(`◀️ ${ctx.t('back-to-matches')}`, `back:matches:${leagueCode}`)
        .row()
        .text(`◀️ ${ctx.t('btn-menu')}`, 'back:main');

      try {
        await ctx.editMessageText(message, {
          reply_markup: keyboard,
          parse_mode: 'Markdown',
        });
      } catch (error) {
        if (
          error &&
          typeof error === 'object' &&
          'description' in error &&
          typeof error.description === 'string' &&
          error.description.includes('message is not modified')
        ) {
          await ctx.answerCallbackQuery();
          return;
        }

        await ctx.reply(message, {
          reply_markup: keyboard,
          parse_mode: 'Markdown',
        });
      }
    } catch (error) {
      log.error({ leagueCode, err: error }, 'failed to fetch standings');
      await ctx.reply(ctx.t('standings-error'));
    }
  });

  return composer;
}
