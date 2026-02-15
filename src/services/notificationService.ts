import { Api } from 'grammy';
import { db } from './dbService';
import { withDbRetry } from '@/utils/retry';
import { createLogger } from '@/utils/logger';

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
  }

  async unsubscribe(userId: number, matchId: number): Promise<void> {
    await withDbRetry(
      () =>
        db.matchSubscription.deleteMany({
          where: { userId, matchId },
        }),
      `unsubscribe(${userId}, ${matchId})`
    );
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
    competition: string
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

    log.info({ matchId, subscriberCount: subs.length }, 'sending pre-match reminders');

    for (const sub of subs) {
      try {
        const message = this.formatPreMatchMessage(
          homeTeam,
          awayTeam,
          competition,
          sub.user.locale
        );

        await this.api.sendMessage(Number(sub.user.telegramId), message, {
          parse_mode: 'Markdown',
        });

        await db.matchSubscription.update({
          where: { id: sub.id },
          data: { notifiedPre: true },
        });
      } catch (error) {
        log.warn({ matchId, telegramId: sub.user.telegramId, err: error }, 'failed to send pre-match reminder');
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
          include: { user: { select: { id: true, telegramId: true, locale: true } } },
        }),
      `postMatchSubs(${matchId})`
    );

    if (subs.length === 0) return;

    log.info({ matchId, subscriberCount: subs.length }, 'sending post-match results');

    for (const sub of subs) {
      try {
        const userPredictions = await db.userPrediction.findMany({
          where: {
            userId: sub.user.id,
            prediction: { matchId },
          },
          include: {
            prediction: {
              include: { accuracy: true },
            },
          },
        });

        const message = this.formatPostMatchMessage(
          homeTeam,
          awayTeam,
          scoreHome,
          scoreAway,
          userPredictions,
          sub.user.locale
        );

        await this.api.sendMessage(Number(sub.user.telegramId), message, {
          parse_mode: 'Markdown',
        });

        await db.matchSubscription.update({
          where: { id: sub.id },
          data: { notifiedPost: true },
        });
      } catch (error) {
        log.warn({ matchId, telegramId: sub.user.telegramId, err: error }, 'failed to send post-match result');
      }
    }
  }

  private formatPreMatchMessage(
    homeTeam: string,
    awayTeam: string,
    competition: string,
    locale: string
  ): string {
    const isRu = locale === 'ru' || locale === 'uk';
    const title = isRu ? 'Матч начнется через 15 минут!' : 'Match starts in 15 minutes!';
    return `🔔 ${title}\n\n🏟️ **${homeTeam}** vs **${awayTeam}**\n🏆 ${competition}`;
  }

  private formatPostMatchMessage(
    homeTeam: string,
    awayTeam: string,
    scoreHome: number,
    scoreAway: number,
    userPredictions: Array<{
      prediction: {
        type: string;
        accuracy: {
          outcomeCorrect: boolean | null;
          goalsOverUnderCorrect: boolean | null;
          bttsCorrect: boolean | null;
        } | null;
      };
    }>,
    locale: string
  ): string {
    const isRu = locale === 'ru' || locale === 'uk';

    let message = isRu ? '🏁 Матч завершен!\n\n' : '🏁 Match finished!\n\n';
    message += `🏟️ **${homeTeam}** ${scoreHome} - ${scoreAway} **${awayTeam}**\n`;

    if (userPredictions.length === 0) {
      message += isRu
        ? '\n📋 У вас нет прогнозов по этому матчу'
        : '\n📋 You have no predictions for this match';
      return message;
    }

    message += isRu ? '\n📊 **Ваши прогнозы:**\n' : '\n📊 **Your predictions:**\n';

    const typeLabels: Record<string, { ru: string; en: string }> = {
      outcome: { ru: 'Исход', en: 'Outcome' },
      total: { ru: 'Тотал', en: 'Total' },
      btts: { ru: 'Обе забьют', en: 'BTTS' },
      corners: { ru: 'Угловые', en: 'Corners' },
      cards: { ru: 'Карточки', en: 'Cards' },
      offsides: { ru: 'Офсайды', en: 'Offsides' },
    };

    for (const up of userPredictions) {
      const label = typeLabels[up.prediction.type] || { ru: up.prediction.type, en: up.prediction.type };
      const typeName = isRu ? label.ru : label.en;

      const accuracy = up.prediction.accuracy;
      let result: string;

      if (!accuracy) {
        result = '⏳';
      } else {
        const correct = this.isCorrect(up.prediction.type, accuracy);
        if (correct === null) {
          result = '—';
        } else {
          result = correct ? '✅' : '❌';
        }
      }

      message += `${result} ${typeName}\n`;
    }

    return message;
  }

  private isCorrect(
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
