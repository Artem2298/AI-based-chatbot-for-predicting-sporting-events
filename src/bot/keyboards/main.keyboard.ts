import { InlineKeyboard } from 'grammy';

export const mainKeyboard = new InlineKeyboard()
  .text('🏴󠁧󠁢󠁥󠁮󠁧󠁿 Premier League', 'league:PL')
  .row()
  .text('🇪🇸 La Liga', 'league:PD')
  .row()
  .text('🇩🇪 Bundesliga', 'league:BL1')
  .row()
  .text('🇮🇹 Serie A', 'league:SA')
  .row()
  .text('🇫🇷 Ligue 1', 'league:FL1');
