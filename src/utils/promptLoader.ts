import { readFile } from 'fs/promises';
import { join } from 'path';
import { createLogger } from '@/utils/logger';

const log = createLogger('prompt');

export async function loadPrompt(
  promptName: string,
  replacements: Record<string, string> = {}
): Promise<string> {
  try {
    const promptPath = join(process.cwd(), 'src', 'prompts', `${promptName}.txt`);
    let content = await readFile(promptPath, 'utf-8');

    Object.entries(replacements).forEach(([key, value]) => {
      content = content.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });

    return content;
  } catch (error) {
    log.error({ promptName, err: error }, 'failed to load prompt');
    throw new Error(`Failed to load prompt template: ${promptName}`);
  }
}