import { asClass, asValue, AwilixContainer } from 'awilix';
import { logger } from './logger.js';
import GameSession from '../domain/GameSession.js';

export async function setDiContainer(diContainer: AwilixContainer) {
  diContainer.register({
    logger: asValue(logger),
  });

  diContainer.register({
    gameSession: asClass(GameSession).singleton(),
  });
}
