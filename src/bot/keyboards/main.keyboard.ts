import { InlineKeyboard } from 'grammy';
import { getLeagueFlag } from '../utils/formatters';

export const mainKeyboard = new InlineKeyboard()
  .text(`${getLeagueFlag('PL')} Premier League`, 'league:PL')
  .row()
  .text(`${getLeagueFlag('PD')} La Liga`, 'league:PD')
  .row()
  .text(`${getLeagueFlag('BL1')} Bundesliga`, 'league:BL1')
  .row()
  .text(`${getLeagueFlag('SA')} Serie A`, 'league:SA')
  .row()
  .text(`${getLeagueFlag('FL1')} Ligue 1`, 'league:FL1')
  .row()
  .text('🕐 Timezone', 'tz:change');
