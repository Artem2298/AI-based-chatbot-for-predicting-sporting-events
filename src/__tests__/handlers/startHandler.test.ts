import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerStartHandler } from '../../bot/handlers/startHandler';
import { createMockT } from '../helpers/mockContext';

// Mock dbService
vi.mock('@/services/dbService', () => ({
  db: {
    user: {
      upsert: vi.fn().mockResolvedValue({}),
    },
  },
  DbService: {
    getInstance: vi.fn(),
  },
}));

describe('startHandler', () => {
  let mockBot: { command: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
    mockBot = {
      command: vi.fn(),
    };
  });

  it('should register /start command', () => {
    registerStartHandler(mockBot as never);
    expect(mockBot.command).toHaveBeenCalledWith(
      'start',
      expect.any(Function)
    );
  });

  it('should reply with welcome message when /start is called', async () => {
    registerStartHandler(mockBot as never);
    const handler = mockBot.command.mock.calls[0][1];

    const t = createMockT();
    const ctx = {
      from: { id: 12345, first_name: 'TestUser', language_code: 'en' },
      reply: vi.fn().mockResolvedValue(true),
      t,
    };

    await handler(ctx);

    expect(ctx.reply).toHaveBeenCalled();
    // Verify t was called with correct key and parameters
    expect(t).toHaveBeenCalledWith('start-welcome', { name: 'TestUser' });
    // Verify the reply contains the translated welcome message
    const replyMessage = ctx.reply.mock.calls[0][0];
    expect(replyMessage).toContain('Hello, TestUser');
  });
});
