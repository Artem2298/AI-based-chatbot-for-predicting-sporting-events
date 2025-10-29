import { Bot } from 'grammy';
import { mainKeyboard } from '../keyboards/main.keyboard';

export function registerStartHandler(bot: Bot) {
  bot.command('start', async (ctx) => {
    const welcomeMessage = `
👋 Hi, ${ctx.from?.first_name}!

I'm AI Sport Prediction Bot ⚽
🎯 What I can do:

Show match schedules
Analyze team form
Generate AI predictions for matches

Choose a league to start:
    `;

    await ctx.reply(welcomeMessage, {
      reply_markup: mainKeyboard,
      parse_mode: 'Markdown',
    });
  });
}
