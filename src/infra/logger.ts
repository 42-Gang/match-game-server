import { pino } from 'pino';

export const logger = pino(
  {
    level: process.env.LOG_LEVEL || 'info',
  },
  pino.transport({
    target: process.env.NODE_ENV === 'dev' ? 'pino-pretty' : 'pino/file',
    options: {
      colorize: true,
      translateTime: 'yyyy-mm-dd HH:MM:ss',
      ignore: 'pid',
    },
  }),
);
