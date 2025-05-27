import 'socket.io';
import { FastifyBaseLogger } from 'fastify';
import { AwilixContainer } from 'awilix';
import { RedisClient } from 'redis';

declare module 'socket.io' {
  interface Server {
    logger: FastifyBaseLogger;
    diContainer: AwilixContainer;
    data: {
      userId: number;
    };
    redis: RedisClient;
  }
}
