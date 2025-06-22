import { pino } from 'pino';

export const logger = pino(
  {
    level: 'debug',
  },
  pino.transport({
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'yyyy-mm-dd HH:MM:ss',
      ignore: 'pid,hostname',
    },
  }),
);
