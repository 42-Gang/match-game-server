import { createServer, Server } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { redis } from './plugins/redis.js';
import closeWithGrace from 'close-with-grace';
import { registerSocketGateway } from './sockets/gateway.js';
import { asClass, asFunction, AwilixContainer, createContainer, Lifetime } from 'awilix';
import { logger } from './plugins/logger.js';
import * as process from 'node:process';
import { startConsumer } from './kafka/consumer.js';

function registerSocketServer(diContainer: AwilixContainer) {
  const httpServer = createServer();
  const io = new SocketIOServer(httpServer);
  io.logger = logger;
  io.diContainer = diContainer;

  registerSocketGateway(diContainer, io);
  return { httpServer, io };
}

function startServer(server: Server) {
  server.listen(process.env.PORT, () => {
    logger.info(`Match Game Server running on port ${process.env.PORT}`);
  });
}

function getMatchServerKey() {
  return `match-server:${process.env.SERVER_NAME}`;
}

async function configureServer() {
  await redis.hSet(getMatchServerKey(), {
    serverName: process.env.SERVER_NAME,
  });

  await redis.expire(getMatchServerKey(), 60 + 10);

  setInterval(async () => {
    logger.info('Match Server Heartbeat');
    await redis.expire(getMatchServerKey(), 60 + 10);
  }, 60 * 1000);
}

export async function setupGracefulShutdown(server: Server, socket: SocketIOServer) {
  closeWithGrace(
    {
      delay: Number(process.env.CLOSE_GRACE_PERIOD) || 500,
    },
    async ({ err }) => {
      if (err !== null) {
        console.log(err);
      }

      server.close();
      await socket.close();

      await redis.sRem('match-server:active', process.env.SERVER_NAME);
      await redis.del(`match-server:${process.env.SERVER_NAME}`);
      await redis.quit();
    },
  );
}

async function registerKafkaConsumer(diContainer: AwilixContainer) {
  const NODE_EXTENSION = process.env.NODE_ENV == 'dev' ? 'ts' : 'js';
  await diContainer.loadModules([`./**/src/**/*.topic.handler.${NODE_EXTENSION}`], {
    esModules: true,
    formatName: 'camelCase',
    resolverOptions: {
      lifetime: Lifetime.SINGLETON,
      register: asClass,
      injectionMode: 'CLASSIC',
    },
  });
  diContainer.register({
    kafkaConsumer: asFunction(startConsumer, {
      lifetime: Lifetime.SINGLETON,
      injectionMode: 'CLASSIC',
    }),
  });
  (async () => {
    await diContainer.resolve('kafkaConsumer');
  })();
}

async function init() {
  const diContainer = createContainer();
  const { httpServer, io } = registerSocketServer(diContainer);
  await configureServer();

  startServer(httpServer);
  registerKafkaConsumer(diContainer);
  await setupGracefulShutdown(httpServer, io); // 서버 종료 시그널 핸들러 등록
}

init();
