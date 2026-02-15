import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPaginationComposer } from '../../bot/handlers/paginationHandler';
import { userMatchesState } from '../../bot/handlers/matchHandler';
import { Match } from '@/types/match.types';
import { createMockCtx } from '../helpers/mockContext';

// Mock showMatchesPage
vi.mock('../../bot/handlers/matchHandler', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    showMatchesPage: vi.fn().mockResolvedValue(true),
  };
});

describe('paginationHandler', () => {
  let composer: ReturnType<typeof createPaginationComposer>;
  let ctx: ReturnType<typeof createMockCtx>;

  beforeEach(() => {
    vi.clearAllMocks();
    composer = createPaginationComposer();
    ctx = createMockCtx();
  });

  async function runMiddleware(context: typeof ctx) {
    await composer.middleware()(context as never, () => Promise.resolve());
  }

  it('should handle next page navigation', async () => {
    (ctx.update as Record<string, unknown>).callback_query = {
      data: 'page:next:PL',
      from: { id: 1 },
    };
    userMatchesState.set(1, {
      matches: [] as unknown as Match[],
      leagueCode: 'PL',
      currentPage: 0,
    });

    await runMiddleware(ctx);

    expect(ctx.answerCallbackQuery).toHaveBeenCalled();
    expect(userMatchesState.get(1)?.currentPage).toBe(1);
  });

  it('should handle prev page navigation', async () => {
    (ctx.update as Record<string, unknown>).callback_query = {
      data: 'page:prev:PL',
      from: { id: 1 },
    };
    userMatchesState.set(1, {
      matches: [] as unknown as Match[],
      leagueCode: 'PL',
      currentPage: 2,
    });

    await runMiddleware(ctx);

    expect(ctx.answerCallbackQuery).toHaveBeenCalled();
    expect(userMatchesState.get(1)?.currentPage).toBe(1);
  });

  it('should show league selection if session expired', async () => {
    (ctx.update as Record<string, unknown>).callback_query = {
      data: 'page:next:PL',
      from: { id: 1 },
    };
    userMatchesState.delete(1);

    await runMiddleware(ctx);

    expect(ctx.answerCallbackQuery).toHaveBeenCalledWith({
      text: 'Error loading league.',
    });
    expect(ctx.reply).toHaveBeenCalledWith(
      'Choose a league:',
      expect.any(Object)
    );
  });
});
