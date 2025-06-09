import process from 'node:process';
import closeWithGrace from 'close-with-grace';
import { Server, Server as SocketIOServer } from 'socket.io';
import { asClass, asFunction, asValue, AwilixContainer, createContainer, Lifetime } from 'awilix';
import { logger } from './infra/logger.js';
import { redis } from './infra/redis.js';
import { setDiContainer } from './infra/container.js';
import { startConsumer } from './infra/kafka/consumer.js';
import { registerSocketGateway } from './network/gateway.js';
import type { BaseLogger } from 'pino';

const PORT = Number(process.env.PORT) || 8080;
const MATCH_KEY = `match-server:${process.env.SERVER_NAME}`;
const HEARTBEAT_TTL = 70;
const HEARTBEAT_INTERVAL = 60_000;
let heartbeatHandle: NodeJS.Timeout;

function setCloseWithGrace(io: Server) {
  closeWithGrace(async () => {
    clearInterval(heartbeatHandle);
    logger.info('Graceful shutdown initiated');

    await io.close();
    logger.info('Socket.IO server closed');

    await redis.del(MATCH_KEY);
    logger.info('Redis key deleted');

    await redis.quit();
    logger.info('Redis connection closed');
  });
}

async function registerKafkaConsumer(diContainer: AwilixContainer) {
  const NODE_EXTENSION = process.env.NODE_ENV == 'dev' ? 'ts' : 'js';
  await diContainer.loadModules([`./**/src/**/*.topic.consumer.${NODE_EXTENSION}`], {
    esModules: true,
    formatName: 'camelCase',
    resolverOptions: {
      lifetime: Lifetime.SINGLETON,
      register: asClass,
      injectionMode: 'CLASSIC',
    },
  });

  const cradle = diContainer.cradle;
  const consumerNames = Object.keys(cradle).filter((k) => k.endsWith('TopicConsumer'));
  const kafkaTopicConsumers = consumerNames.map((name) => cradle[name]);
  diContainer.register({
    topicConsumers: asValue(kafkaTopicConsumers),
    kafkaConsumer: asFunction(startConsumer, {
      lifetime: Lifetime.SINGLETON,
      injectionMode: 'CLASSIC',
    }),
  });
  await diContainer.resolve('kafkaConsumer');
}

async function startHeartbeat() {
  await redis.set(MATCH_KEY, process.env.SERVER_NAME!);
  await redis.expire(MATCH_KEY, HEARTBEAT_TTL);
  heartbeatHandle = setInterval(async () => {
    logger.info('Match Server Heartbeat');
    await redis.expire(MATCH_KEY, HEARTBEAT_TTL);
  }, HEARTBEAT_INTERVAL);
}

async function init() {
  const di = createContainer();
  await setDiContainer(di);

  await registerKafkaConsumer(di);
  const io = new SocketIOServer(PORT, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });
  io.logger = logger as BaseLogger;
  io.diContainer = di;
  registerSocketGateway(di, io);

  await startHeartbeat();
  setCloseWithGrace(io);

  logger.info(`Server listening on port ${PORT}`);
}

init().catch((err) => {
  logger.error('Initialization failed', err);
  process.exit(1);
});
