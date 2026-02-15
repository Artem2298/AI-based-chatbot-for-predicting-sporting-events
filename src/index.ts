import { bot, syncService } from './bot/bot';
import { config } from './config';
import { DbService } from './services/dbService';
import { createLogger } from '@/utils/logger';

const log = createLogger('app');

async function main() {
  log.info({ env: config.env }, 'starting AI Sport Prediction Bot');

  await DbService.connect();
  syncService.scheduleDailySync();

  // Initial sync + monitoring (non-blocking)
  syncService.syncUpcomingMatches()
    .then(() => syncService.scheduleMatchMonitoring())
    .catch((err) => log.error({ err }, 'initial sync failed'));

  log.info('bot is running');

  await bot.start();
}

process.once('SIGINT', async () => {
  log.info('received SIGINT, shutting down');
  syncService.stopSchedule();
  bot.stop();
  await DbService.disconnect();
  process.exit(0);
});

process.once('SIGTERM', async () => {
  log.info('received SIGTERM, shutting down');
  syncService.stopSchedule();
  bot.stop();
  await DbService.disconnect();
  process.exit(0);
});

main().catch((error) => {
  log.fatal({ err: error }, 'failed to start bot');
  process.exit(1);
});
