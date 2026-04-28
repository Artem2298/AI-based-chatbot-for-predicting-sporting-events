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
        config: {
          tools: [{ googleSearch: {} }],
        },
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
    const jsonPrompt = `${prompt}\n\nReturn the answer ONLY in JSON format, without markdown formatting, without any additional text.`;

    const parse = (text: string): Record<string, unknown> =>
      JSON.parse(
        text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      );

    try {
      return parse(await this.generateText(jsonPrompt));
    } catch (error) {
      log.warn({ err: error }, 'invalid response, retrying once');
    }

    try {
      return parse(await this.generateText(jsonPrompt));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log.error({ err: error }, 'failed to parse JSON after retry');
      throw new Error(`Failed to generate JSON: ${message}`);
    }
  }
}

export const geminiClient = new GeminiClient();
