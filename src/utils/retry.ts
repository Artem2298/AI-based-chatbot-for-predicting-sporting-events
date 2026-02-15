import { createLogger } from '@/utils/logger';

const log = createLogger('retry');

export interface RetryOptions {
  retries?: number;
  delayMs?: number;
  label?: string;
}

/**
 * Retries an async function with exponential backoff.
 * Default: 3 retries, 2s initial delay (2s → 4s → 8s).
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  const { retries = 3, delayMs = 2000, label = 'operation' } = options || {};

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt < retries) {
        const delay = delayMs * Math.pow(2, attempt);
        log.warn({ label, attempt: attempt + 1, retries, delayMs: delay, err: error }, 'retrying operation');
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/** Prisma error codes that indicate a transient connection issue */
const PRISMA_TRANSIENT_CODES = new Set([
  'P1001', // Can't reach database server
  'P1002', // Database server timed out
  'P1008', // Operations timed out
  'P1017', // Server closed the connection
  'P2024', // Connection pool timeout
]);

/**
 * Checks if an error is a transient Prisma connection error.
 */
export function isPrismaTransientError(error: unknown): boolean {
  if (
    error &&
    typeof error === 'object' &&
    'code' in error &&
    typeof (error as { code: unknown }).code === 'string'
  ) {
    return PRISMA_TRANSIENT_CODES.has((error as { code: string }).code);
  }
  return false;
}

/**
 * Retries a DB operation only on transient Prisma errors.
 * Non-transient errors are thrown immediately.
 */
export async function withDbRetry<T>(
  fn: () => Promise<T>,
  label: string = 'db operation'
): Promise<T> {
  const retries = 3;
  const delayMs = 2000;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (!isPrismaTransientError(error)) {
        throw error;
      }

      lastError = error;

      if (attempt < retries) {
        const delay = delayMs * Math.pow(2, attempt);
        log.warn({ label, attempt: attempt + 1, retries, delayMs: delay, err: error }, 'retrying DB operation');
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}
