import { GoogleGenAI } from '@google/genai';
import { config } from '@/config';
import { createLogger } from '@/utils/logger';

const log = createLogger('gemini');

export class GeminiClient {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({
      apiKey: config.gemini.apiKey,
    });
  }

  async generateText(prompt: string): Promise<string> {
    try {
      const response = await this.ai.models.generateContent({
        model: config.gemini.model,
        contents: prompt,
      });

      if (!response || !response.text) {
        log.error({ response }, 'invalid response structure');
        throw new Error('Invalid response from Gemini API');
      }

      return response.text;
    } catch (error) {
      log.error({ err: error }, 'Gemini API error');
      throw new Error(
        `Failed to generate content: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async generateJSON(prompt: string): Promise<Record<string, unknown>> {
    try {
      const jsonPrompt = `${prompt}\n\nВерни ответ ТОЛЬКО в формате JSON, без markdown форматирования, без дополнительного текста.`;

      const text = await this.generateText(jsonPrompt);

      const cleanedText = text
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      return JSON.parse(cleanedText);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log.error({ err: error }, 'failed to parse JSON');
      throw new Error(`Failed to generate JSON: ${message}`);
    }
  }
}

export const geminiClient = new GeminiClient();
