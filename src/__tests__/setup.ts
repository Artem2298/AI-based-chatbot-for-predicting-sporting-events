import { vi } from 'vitest';

// Mock the logger globally so pino never writes to stdout during tests.
vi.mock('@/utils/logger', () => {
  const noopLogger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn().mockReturnThis(),
  };

  return {
    logger: noopLogger,
    createLogger: () => noopLogger,
  };
});
