import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GeminiClient } from '@/api/ai/geminiClient';

// Mock @google/genai
vi.mock('@google/genai', () => {
  return {
    GoogleGenAI: vi.fn().mockImplementation(() => ({
      models: {
        generateContent: vi.fn()
      }
    }))
  };
});

// Mock config
vi.mock('@/config', () => ({
  config: {
    gemini: {
      apiKey: 'test-api-key',
      model: 'gemini-1.5-pro'
    }
  }
}));

describe('GeminiClient', () => {
  let client: GeminiClient;
  let mockGenAI: {
    models: {
      generateContent: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();
    client = new GeminiClient();
    mockGenAI = (client as unknown as { ai: typeof mockGenAI }).ai;
  });

  describe('generateText', () => {
    it('should return generated text on success', async () => {
      const mockResponse = {
        text: 'Hello world'
      };
      mockGenAI.models.generateContent.mockResolvedValue(mockResponse);

      const result = await client.generateText('Say hello');

      expect(result).toBe('Hello world');
      expect(mockGenAI.models.generateContent).toHaveBeenCalledWith({
        model: 'gemini-1.5-pro',
        contents: 'Say hello',
        config: {
          tools: [{ googleSearch: {} }],
        },
      });
    });

    it('should throw error if response text is missing', async () => {
      mockGenAI.models.generateContent.mockResolvedValue({});

      await expect(client.generateText('test')).rejects.toThrow('Invalid response from Gemini API');
    });

    it('should throw error if API call fails', async () => {
      mockGenAI.models.generateContent.mockRejectedValue(new Error('Network error'));

      await expect(client.generateText('test')).rejects.toThrow('Failed to generate content: Network error');
    });
  });

  describe('generateJSON', () => {
    it('should parse JSON from response and clean markdown tags', async () => {
      mockGenAI.models.generateContent.mockResolvedValue({
        text: '```json\n{"key": "value"}\n```',
      });

      const result = await client.generateJSON('Give me JSON');

      expect(result).toEqual({ key: 'value' });
    });

    it('should parse plain JSON without markdown tags', async () => {
      mockGenAI.models.generateContent.mockResolvedValue({
        text: '{"score": 42}',
      });

      const result = await client.generateJSON('Give me JSON');

      expect(result).toEqual({ score: 42 });
    });

    it('should retry once and succeed if first attempt returns invalid JSON', async () => {
      mockGenAI.models.generateContent
        .mockResolvedValueOnce({ text: 'Not a JSON' })
        .mockResolvedValueOnce({ text: '{"ok": true}' });

      const result = await client.generateJSON('test');

      expect(mockGenAI.models.generateContent).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ ok: true });
    });

    it('should throw error if both attempts return invalid JSON', async () => {
      mockGenAI.models.generateContent.mockResolvedValue({ text: 'Not a JSON' });

      await expect(client.generateJSON('test')).rejects.toThrow('Failed to generate JSON');
      expect(mockGenAI.models.generateContent).toHaveBeenCalledTimes(2);
    });
  });
});
