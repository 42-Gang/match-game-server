import { asValue, AwilixContainer } from 'awilix';
import { logger } from './logger.js';

export async function setDiContainer(diContainer: AwilixContainer) {
  diContainer.register({
    logger: asValue(logger),
  });
}
