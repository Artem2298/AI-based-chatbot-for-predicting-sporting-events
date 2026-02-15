import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadPrompt } from '@/utils/promptLoader';
import { readFile } from 'fs/promises';

// Mock fs/promises
vi.mock('fs/promises');

describe('PromptLoader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should load prompt and perform replacements', async () => {
    const mockContent = 'Hello {{NAME}}, welcome to {{PLACE}}!';
    vi.mocked(readFile).mockResolvedValue(mockContent);

    const result = await loadPrompt('test', { NAME: 'User', PLACE: 'Earth' });

    expect(result).toBe('Hello User, welcome to Earth!');
    expect(readFile).toHaveBeenCalled();
  });

  it('should return original content if no replacements provided', async () => {
    const mockContent = 'Static prompt';
    vi.mocked(readFile).mockResolvedValue(mockContent);

    const result = await loadPrompt('test');

    expect(result).toBe('Static prompt');
  });

  it('should throw error if file reading fails', async () => {
    vi.mocked(readFile).mockRejectedValue(new Error('File not found'));

    await expect(loadPrompt('missing')).rejects.toThrow('Failed to load prompt template: missing');
  });
});
