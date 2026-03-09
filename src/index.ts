import http from 'http';
import { bot, syncService } from './bot/bot';
import { config } from './config';
import { DbService } from './services/dbService';
import { createLogger } from '@/utils/logger';
import { array } from 'zod';

const log = createLogger('app');

const PORT = parseInt(process.env.PORT || '8080', 10);

async function main() {
  log.info({ env: config.env }, 'starting AI Sport Prediction Bot');

  await DbService.connect();
  syncService.scheduleDailySync();

  // Initial sync + monitoring (non-blocking)
  syncService.syncUpcomingMatches()
    .then(() => syncService.syncFinishedMatches())
    .then(() => syncService.scheduleMatchMonitoring())
    .catch((err) => log.error({ err }, 'initial sync failed'));

  // Health check server for Koyeb
  http
    .createServer((_req, res) => {
      res.writeHead(200);
      res.end('OK');
    })
    .listen(PORT, () => {
      log.info({ port: PORT }, 'health check server started');
    });

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
