import { asClass, asValue, AwilixContainer, createContainer } from 'awilix';
import { logger } from './logger.js';
import GameSession from '../domain/GameSession.js';
import GameManager from '../domain/GameManager.js';
import GameSpace from '../domain/physics/GameSpace.js';
import Judgement from '../domain/Judgement.js';
import Ball from '../domain/physics/Ball.js';
import Racket from '../domain/physics/Racket.js';
import Table, { TableType } from '../domain/physics/Table.js';
import { playerTypeSchema } from '../domain/game.schema.js';
import { BaseLogger } from 'pino';

export interface Cradle {
  // primitive values
  player1Id: number;
  player2Id: number;
  gravityY: number;
  scoreToWin: number;

  // singletons / classes
  logger: BaseLogger;
  gameSession: GameSession;

  // scoped services
  gameManager: GameManager;
  gameSpace: GameSpace;
  judgement: Judgement;
  ball: Ball;
  racket1: Racket;
  racket2: Racket;
  tablePlayer1: Table;
  tablePlayer2: Table;
}

export async function createDiContainer(): Promise<AwilixContainer<Cradle>> {
  const diContainer = createContainer<Cradle>({
    injectionMode: 'CLASSIC',
  });

  // 1) primitive 값들
  diContainer.register({
    player1Id: asValue(Number(process.env.PLAYER1_ID)),
    player2Id: asValue(Number(process.env.PLAYER2_ID)),
    gravityY: asValue(Number(process.env.GRAVITY_Y)),
    scoreToWin: asValue(Number(process.env.SCORE_TO_WIN)),
    logger: asValue(logger),
  });

  // 2) 싱글톤
  diContainer.register({
    gameSession: asClass(GameSession).singleton(),
  });

  // 3) scoped 클래스들
  diContainer.register({
    gameManager: asClass(GameManager).scoped(),
    gameSpace: asClass(GameSpace).scoped(),
    judgement: asClass(Judgement).scoped(),
    ball: asClass(Ball).scoped(),

    racket1: asClass(Racket)
      .scoped()
      .inject((container) => {
        const cradle = (container as AwilixContainer<Cradle>).cradle;
        return {
          playerId: cradle.player1Id,
          playerType: playerTypeSchema.enum.PLAYER1,
        };
      }),

    racket2: asClass(Racket)
      .scoped()
      .inject((container) => {
        const cradle = (container as AwilixContainer<Cradle>).cradle;
        return {
          playerId: cradle.player2Id,
          playerType: playerTypeSchema.enum.PLAYER2,
        };
      }),

    tablePlayer1: asClass(Table)
      .scoped()
      .inject((container) => {
        const cradle = (container as AwilixContainer<Cradle>).cradle;
        return {
          playerId: cradle.player1Id,
          tableType: TableType.PLAYER1,
        };
      }),

    tablePlayer2: asClass(Table)
      .scoped()
      .inject((container) => {
        const cradle = (container as AwilixContainer<Cradle>).cradle;
        return {
          playerId: cradle.player2Id,
          tableType: TableType.PLAYER2,
        };
      }),
  });

  return diContainer;
}
