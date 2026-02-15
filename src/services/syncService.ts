import { schedule, ScheduledTask } from 'node-cron';
import { MatchService } from './matchService';
import { AccuracyService } from './accuracyService';
import { NotificationService } from './notificationService';
import { db } from './dbService';
import { withRetry, withDbRetry } from '@/utils/retry';
import { createLogger } from '@/utils/logger';

const log = createLogger('sync');

const LEAGUES = ['PL', 'BL1', 'SA', 'PD', 'FL1'];
const RATE_LIMIT_PAUSE = 2000;
const CHECK_INTERVAL = 5 * 60 * 1000; // 5 min
const MATCH_DURATION_BUFFER = 2 * 60 * 60 * 1000; // kick-off + 2h buffer
const MAX_MONITORING_TIME = 60 * 60 * 1000; // 1h monitoring window
const STANDINGS_DELAY = 15 * 60 * 1000; // 15 min delay for API standings update
const PRE_MATCH_REMINDER = 15 * 60 * 1000; // 15 min before kick-off

export class SyncService {
  private cronJobs: ScheduledTask[] = [];
  private matchMonitors: Map<number, NodeJS.Timeout> = new Map();
  private matchTimeouts: Map<number, NodeJS.Timeout> = new Map();
  private reminderTimeouts: Map<number, NodeJS.Timeout> = new Map();
  private standingsTimeouts: NodeJS.Timeout[] = [];

  constructor(
    private matchService: MatchService,
    private accuracyService: AccuracyService,
    private notificationService: NotificationService
  ) {}

  async syncUpcomingMatches(
    competitions: string[] = LEAGUES,
    days: number = 14
  ) {
    log.info({ competitionCount: competitions.length }, 'starting sync');

    for (const code of competitions) {
      try {
        log.debug({ competition: code }, 'syncing competition');
        const matches = await withRetry(
          () => this.matchService.getUpcomingMatches(code, days),
          { retries: 2, delayMs: 3000, label: `sync(${code})` }
        );
        log.info({ competition: code, count: matches.length }, 'synced upcoming matches');

        await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_PAUSE));
      } catch (error) {
        log.error({ competition: code, err: error }, 'sync failed');
      }
    }

    log.info('sync completed');
  }

  async scheduleMatchMonitoring() {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const tomorow = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const matches = await withDbRetry(
      () =>
        db.match.findMany({
          where: {
            utcDate: { gte: yesterday, lte: tomorow },
            status: {
              notIn: [
                'FINISHED',
                'CANCELLED',
                'POSTPONED',
                'SUSPENDED',
                'AWARDED',
              ],
            },
          },
          include: { homeTeam: true, awayTeam: true },
        }),
      'scheduleMatchMonitoring'
    );

    if (matches.length === 0) {
      log.info('no matches to monitor');
      return;
    }

    let scheduled = 0;
    let reminders = 0;

    for (const match of matches) {
      const now = Date.now();

      if (!this.reminderTimeouts.has(match.id)) {
        const reminderTime = match.utcDate.getTime() - PRE_MATCH_REMINDER;

        if (reminderTime > now) {
          const delay = reminderTime - now;
          const timeout = setTimeout(() => {
            this.reminderTimeouts.delete(match.id);
            this.sendPreMatchReminder(match.id, match.homeTeam.name, match.awayTeam.name, match.competitionName);
          }, delay);
          this.reminderTimeouts.set(match.id, timeout);
          reminders++;
        } else if (match.utcDate.getTime() > now) {
          this.sendPreMatchReminder(match.id, match.homeTeam.name, match.awayTeam.name, match.competitionName);
        }
      }

      if (this.matchMonitors.has(match.id) || this.matchTimeouts.has(match.id))
        continue;

      const expectedEndTime = match.utcDate.getTime() + MATCH_DURATION_BUFFER;
      const monitorDeadline = expectedEndTime + MAX_MONITORING_TIME;

      if (now > monitorDeadline) {
        this.doSingleCheck(match.id, match.competitionCode);
      } else if (now >= expectedEndTime) {
        const remaining = Math.round((monitorDeadline - now) / 60000);
        log.info(
          { matchId: match.id, remainingMin: remaining },
          'monitoring match now'
        );
        this.startMatchMonitor(
          match.id,
          match.competitionCode,
          monitorDeadline
        );
        scheduled++;
      } else {
        const delay = expectedEndTime - now;
        const timeout = setTimeout(() => {
          this.matchTimeouts.delete(match.id);
          this.startMatchMonitor(
            match.id,
            match.competitionCode,
            monitorDeadline
          );
        }, delay);
        this.matchTimeouts.set(match.id, timeout);

        const startAt = match.utcDate.toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
        });
        const checkAt = new Date(expectedEndTime).toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
        });
        log.info(
          { matchId: match.id, kickoff: startAt, monitorFrom: checkAt },
          'match monitoring scheduled'
        );
        scheduled++;
      }
    }

    if (scheduled > 0) {
      log.info({ count: scheduled }, 'matches scheduled for monitoring');
    }
    if (reminders > 0) {
      log.info({ count: reminders }, 'pre-match reminders scheduled');
    }
  }

  private async sendPreMatchReminder(
    matchId: number,
    homeTeam: string,
    awayTeam: string,
    competition: string
  ) {
    try {
      await this.notificationService.sendPreMatchReminders(
        matchId,
        homeTeam,
        awayTeam,
        competition
      );
    } catch (error) {
      log.error({ matchId, err: error }, 'failed to send pre-match reminders');
    }
  }

  private startMatchMonitor(
    matchId: number,
    competitionCode: string,
    deadline: number
  ) {
    this.checkMatch(matchId, competitionCode);

    const interval = setInterval(() => {
      if (Date.now() > deadline) {
        log.info({ matchId }, 'stopped monitoring (1h window expired)');
        clearInterval(interval);
        this.matchMonitors.delete(matchId);
        return;
      }
      this.checkMatch(matchId, competitionCode);
    }, CHECK_INTERVAL);

    this.matchMonitors.set(matchId, interval);
  }

  private async checkMatch(matchId: number, competitionCode: string) {
    try {
      const updated = await withRetry(
        () => this.matchService.refreshMatchFromApi(matchId),
        { retries: 3, delayMs: 5000, label: `checkMatch(${matchId})` }
      );

      if (updated.status === 'FINISHED') {
        const interval = this.matchMonitors.get(matchId);
        if (interval) {
          clearInterval(interval);
          this.matchMonitors.delete(matchId);
        }

        log.info(
          { matchId, homeTeam: updated.homeTeam, awayTeam: updated.awayTeam, scoreHome: updated.score.home, scoreAway: updated.score.away },
          'match finished'
        );

        if (updated.score.home !== null && updated.score.away !== null) {
          await this.onMatchFinished(
            matchId,
            competitionCode,
            updated.homeTeam,
            updated.awayTeam,
            updated.score.home,
            updated.score.away
          );
        }
      } else {
        log.debug({ matchId, status: updated.status }, 'match status check');
      }
    } catch (error) {
      log.error({ matchId, err: error }, 'error checking match');
    }
  }

  private async onMatchFinished(
    matchId: number,
    competitionCode: string,
    homeTeam: string,
    awayTeam: string,
    scoreHome: number,
    scoreAway: number
  ) {
    try {
      await withRetry(
        () => this.accuracyService.evaluateMatch(matchId, scoreHome, scoreAway),
        { retries: 2, delayMs: 3000, label: `evaluateMatch(${matchId})` }
      );
    } catch (error) {
      log.error({ matchId, err: error }, 'failed to evaluate match');
    }

    try {
      await this.notificationService.sendPostMatchResults(
        matchId,
        homeTeam,
        awayTeam,
        scoreHome,
        scoreAway
      );
    } catch (error) {
      log.error({ matchId, err: error }, 'failed to send post-match notifications');
    }

    log.info({ competitionCode, delayMin: 15 }, 'standings update scheduled');
    const timeout = setTimeout(async () => {
      try {
        this.matchService.clearStandingsCache(competitionCode);
        await withRetry(
          () => this.matchService.getStandings(competitionCode),
          { retries: 2, delayMs: 5000, label: `standings(${competitionCode})` }
        );
        log.info({ competitionCode }, 'standings updated');
      } catch (error) {
        log.error({ competitionCode, err: error }, 'failed to update standings');
      }
    }, STANDINGS_DELAY);
    this.standingsTimeouts.push(timeout);
  }

  private async doSingleCheck(matchId: number, competitionCode: string) {
    try {
      const updated = await withRetry(
        () => this.matchService.refreshMatchFromApi(matchId),
        { retries: 2, delayMs: 5000, label: `lateCheck(${matchId})` }
      );

      if (
        updated.status === 'FINISHED' &&
        updated.score.home !== null &&
        updated.score.away !== null
      ) {
        log.info(
          { matchId, homeTeam: updated.homeTeam, awayTeam: updated.awayTeam, scoreHome: updated.score.home, scoreAway: updated.score.away },
          'match finished (late check)'
        );
        await this.onMatchFinished(
          matchId,
          competitionCode,
          updated.homeTeam,
          updated.awayTeam,
          updated.score.home,
          updated.score.away
        );
      }

      await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_PAUSE));
    } catch (error) {
      log.error({ matchId, err: error }, 'late check failed');
    }
  }

  scheduleDailySync() {
    const job = schedule('0 6 * * *', async () => {
      log.info('daily sync triggered');
      await this.syncUpcomingMatches();
      await this.scheduleMatchMonitoring();
    });

    this.cronJobs.push(job);
    log.info('daily sync scheduled at 06:00 UTC');
  }

  stopSchedule() {
    for (const job of this.cronJobs) {
      job.stop();
    }
    this.cronJobs = [];

    for (const timeout of this.matchTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.matchTimeouts.clear();

    for (const timeout of this.reminderTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.reminderTimeouts.clear();

    for (const interval of this.matchMonitors.values()) {
      clearInterval(interval);
    }
    this.matchMonitors.clear();

    for (const timeout of this.standingsTimeouts) {
      clearTimeout(timeout);
    }
    this.standingsTimeouts = [];

    log.info('all scheduled tasks stopped');
  }
}
