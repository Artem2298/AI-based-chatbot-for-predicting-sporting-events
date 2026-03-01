import pino from 'pino';
import { config } from '@/config';

const isDev = config.env !== 'production';

export const logger = pino({
  level: config.logLevel,
  ...(!isDev && { base: undefined }),
  ...(isDev && {
    transport: {
      target: 'pino-pretty',
      options: {
        ignore: 'pid,hostname',
        translateTime: 'SYS:HH:MM:ss',
        messageFormat: '[{module}] {msg}',
      },
    },
  }),
});

export function createLogger(name: string) {
  return logger.child({ module: name });
}
