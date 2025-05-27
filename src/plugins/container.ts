import { asValue, AwilixContainer } from 'awilix';
import { Server } from 'http';
import { logger } from './logger.js';

export async function setDiContainer(server: Server, diContainer: AwilixContainer) {
  diContainer.register({
    logger: asValue(logger),
  });
}
