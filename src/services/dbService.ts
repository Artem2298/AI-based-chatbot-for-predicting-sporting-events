import { PrismaClient } from '../generated/prisma';
import { createLogger } from '@/utils/logger';

const log = createLogger('db');

export class DbService {
  private static instance: PrismaClient;

  public static getInstance(): PrismaClient {
    if (!DbService.instance) {
      DbService.instance = new PrismaClient({
        log: ['error', 'warn'],
      });
    }
    return DbService.instance;
  }

  public static async connect() {
    try {
      const prisma = this.getInstance();
      await prisma.$connect();
      log.info('connected to PostgreSQL via Prisma');
    } catch (error) {
      log.error({ err: error }, 'failed to connect to database');
      throw error;
    }
  }

  public static async disconnect() {
    if (DbService.instance) {
      await DbService.instance.$disconnect();
    }
  }

  public static async getUserByTelegramId(telegramId: number) {
    return await this.getInstance().user.findUnique({
      where: { telegramId: BigInt(telegramId) },
      select: { id: true }
    });
  }
}

export const db = DbService.getInstance();
