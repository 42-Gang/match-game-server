import { asClass, asValue, AwilixContainer } from 'awilix';
import { logger } from './logger.js';
import GameSession from '../domain/GameSession.js';
import GameManager from '../domain/GameManager.js';
import GameSpace from '../domain/physics/GameSpace.js';
import Judgement from '../domain/Judgement.js';
import Ball from '../domain/physics/Ball.js';
import Racket from '../domain/physics/Racket.js';
import Table, { TableType } from '../domain/physics/Table.js';

export async function setDiContainer(diContainer: AwilixContainer) {
  diContainer.register({
    container: asValue(diContainer),
  });

  diContainer.register({
    logger: asValue(logger),
    scoreToWin: asValue(Number(process.env.SCORE_TO_WIN)),
  });

  diContainer.register({
    gameSession: asClass(GameSession).singleton(),

    gameManager: asClass(GameManager).scoped(),
    gameSpace: asClass(GameSpace).scoped(),
    judgement: asClass(Judgement).scoped(),

    ball: asClass(Ball).scoped(),
    racket1: asClass(Racket)
      .scoped()
      .inject((container) => ({
        playerId: container.cradle.player1Id,
      })),
    racket2: asClass(Racket)
      .scoped()
      .inject((container) => ({
        playerId: container.cradle.player2Id,
      })),
    tablePlayer1: asClass(Table)
      .scoped()
      .inject((container) => ({
        playerId: container.cradle.player1Id,
        tableType: TableType.PLAYER1,
      })),
    tablePlayer2: asClass(Table)
      .scoped()
      .inject((container) => ({
        playerId: container.cradle.player2Id,
        tableType: TableType.PLAYER2,
      })),
  });
}
