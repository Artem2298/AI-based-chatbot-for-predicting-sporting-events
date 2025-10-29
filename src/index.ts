import { bot } from './bot/bot';
import { config } from './config';

async function main() {
  console.log('🚀 Starting AI Sport Prediction Bot...');
  console.log(`📍 Environment: ${config.env}`);
  console.log('✅ Bot is running!');
  console.log('🛑 Press Ctrl+C to stop');

  await bot.start();
}

process.once('SIGINT', () => {
  console.log('\n🛑 Stopping bot...');
  bot.stop();
  process.exit(0);
});

process.once('SIGTERM', () => {
  console.log('\n🛑 Stopping bot...');
  bot.stop();
  process.exit(0);
});

// Запуск
main().catch((error) => {
  console.error('❌ Failed to start bot:', error);
  process.exit(1);
});
