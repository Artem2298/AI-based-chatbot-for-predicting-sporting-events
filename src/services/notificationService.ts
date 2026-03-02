import { Api } from 'grammy';
import { db } from './dbService';
import { withDbRetry } from '@/utils/retry';
import { createLogger } from '@/utils/logger';
import { i18n } from '@/bot/bot';
import { getLeagueFlag } from '@/bot/utils/formatters';

const log = createLogger('notification');

export class NotificationService {
  constructor(private api: Api) {}

  async subscribe(userId: number, matchId: number): Promise<void> {
    await withDbRetry(
      () =>
        db.matchSubscription.upsert({
          where: { userId_matchId: { userId, matchId } },
          update: {},
          create: { userId, matchId },
        }),
      `subscribe(${userId}, ${matchId})`
    );
    log.info({ userId, matchId }, 'user subscribed to match');
  }

  async unsubscribe(userId: number, matchId: number): Promise<void> {
    await withDbRetry(
      () =>
        db.matchSubscription.deleteMany({
          where: { userId, matchId },
        }),
      `unsubscribe(${userId}, ${matchId})`
    );
    log.info({ userId, matchId }, 'user unsubscribed from match');
  }

  async isSubscribed(userId: number, matchId: number): Promise<boolean> {
    const sub = await withDbRetry(
      () =>
        db.matchSubscription.findUnique({
          where: { userId_matchId: { userId, matchId } },
          select: { id: true },
        }),
      `isSubscribed(${userId}, ${matchId})`
    );
    return !!sub;
  }

  async sendPreMatchReminders(
    matchId: number,
    homeTeam: string,
    awayTeam: string,
    competition: string,
    competitionCode: string = ''
  ): Promise<void> {
    const subs = await withDbRetry(
      () =>
        db.matchSubscription.findMany({
          where: { matchId, notifiedPre: false },
          include: { user: { select: { telegramId: true, locale: true } } },
        }),
      `preMatchSubs(${matchId})`
    );

    if (subs.length === 0) return;

    log.info(
      { matchId, subscriberCount: subs.length },
      'sending pre-match reminders'
    );

    for (const sub of subs) {
      try {
        const locale = sub.user.locale || 'en';
        const title = i18n.t(locale, 'notify-pre-match-title');
        const flag = getLeagueFlag(competitionCode);
        const message = `🔔 ${title}\n\n🏟️ **${homeTeam}** vs **${awayTeam}**\n${flag} ${competition}`;

        await this.api.sendMessage(Number(sub.user.telegramId), message, {
          parse_mode: 'Markdown',
        });

        await db.matchSubscription.update({
          where: { id: sub.id },
          data: { notifiedPre: true },
        });
      } catch (error) {
        log.warn(
          { matchId, telegramId: sub.user.telegramId, err: error },
          'failed to send pre-match reminder'
        );
      }
    }
  }

  async sendPostMatchResults(
    matchId: number,
    homeTeam: string,
    awayTeam: string,
    scoreHome: number,
    scoreAway: number
  ): Promise<void> {
    const subs = await withDbRetry(
      () =>
        db.matchSubscription.findMany({
          where: { matchId, notifiedPost: false },
          include: {
            user: { select: { id: true, telegramId: true, locale: true } },
          },
        }),
      `postMatchSubs(${matchId})`
    );

    if (subs.length === 0) return;

    log.info(
      { matchId, subscriberCount: subs.length },
      'sending post-match results'
    );

    for (const sub of subs) {
      try {
        const locale = sub.user.locale || 'en';
        const userPredictions = await db.userPrediction.findMany({
          where: {
            userId: sub.user.id,
            prediction: { matchId, locale },
          },
          include: {
            prediction: {
              include: { accuracy: true },
            },
          },
        });

        const title = i18n.t(locale, 'notify-post-match-title');
        
        let message = `🏁 ${title}\n\n`;
        message += `🏟️ **${homeTeam}** ${scoreHome} - ${scoreAway} **${awayTeam}**\n`;

        if (userPredictions.length === 0) {
          message += `\n${i18n.t(locale, 'notify-no-predictions')}`;
        } else {
          message += `\n${i18n.t(locale, 'notify-your-predictions')}\n`;

          for (const up of userPredictions) {
            const typeLabel = i18n.t(locale, `notify-type-${up.prediction.type}`);
            const accuracy = up.prediction.accuracy;
            let resultEmoji: string;

            if (!accuracy) {
              resultEmoji = '⏳';
            } else {
              const correct = this.resolveAccuracy(up.prediction.type, accuracy);
              resultEmoji = correct === null ? '—' : correct ? '✅' : '❌';
            }

            message += `${resultEmoji} ${typeLabel}\n`;
          }
        }

        await this.api.sendMessage(Number(sub.user.telegramId), message, {
          parse_mode: 'Markdown',
        });

        await db.matchSubscription.update({
          where: { id: sub.id },
          data: { notifiedPost: true },
        });
      } catch (error) {
        log.warn(
          { matchId, telegramId: sub.user.telegramId, err: error },
          'failed to send post-match result'
        );
      }
    }
  }

  private resolveAccuracy(
    type: string,
    accuracy: {
      outcomeCorrect: boolean | null;
      goalsOverUnderCorrect: boolean | null;
      bttsCorrect: boolean | null;
    }
  ): boolean | null {
    switch (type) {
      case 'outcome':
        return accuracy.outcomeCorrect;
      case 'total':
      case 'goals':
        return accuracy.goalsOverUnderCorrect;
      case 'btts':
        return accuracy.bttsCorrect;
      default:
        return null;
    }
  }
}
