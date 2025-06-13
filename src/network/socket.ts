import { Server } from 'socket.io';
import { asValue, AwilixContainer } from 'awilix';
import { socketMiddleware } from './utils/middleware.js';
import Ball from '../domain/physics/Ball.js';
import Table from '../domain/physics/Table.js';
import Racket from '../domain/physics/Racket.js';
import GameSpace from '../domain/physics/GameSpace.js';
import { playerTypeSchema } from '../domain/game.schema.js';
import { matchMiddleware } from './match.middleware.js';

function createGameSpace() {
  const ball = new Ball();
  const table = new Table();
  const racket1 = new Racket(playerTypeSchema.enum.PLAYER1);
  const racket2 = new Racket(playerTypeSchema.enum.PLAYER2);
  return new GameSpace(ball, table, racket1, racket2);
}

export const registerSocket = (diContainer: AwilixContainer, io: Server) => {
  io.use(socketMiddleware);
  io.use(matchMiddleware);

  diContainer.register({
    io: asValue(io),
  });

  const fixedTimeStep = 1 / 60; // 60Hz
  const intervalMs = fixedTimeStep * 1000;

  const matches = new Map<number, GameSpace>();
  const timer = setInterval(() => {
    for (const [matchId, gameSpace] of matches.entries()) {
      gameSpace.step(fixedTimeStep);

      const message = {
        ball: gameSpace.getBallPosition(),
        racket1: gameSpace.getRacket1Position(),
      };
      io.to(`match:${matchId}`).emit('game:update', message);

      if (gameSpace.getBallPosition().y <= 0) {
        clearInterval(timer);
      }
    }
  }, intervalMs);

  io.on('connection', (socket) => {
    const logger = io.logger;
    const matchId = socket.data.matchId;

    socket.join(`match:${matchId}`);
    logger.info(`New connection: ${socket.id} from user ${socket.data.userId}`);

    if (!matches.has(matchId)) {
      matches.set(matchId, createGameSpace());
    }

    socket.on('racket:update', (data) => {
      const { x, y, z } = data;
      const gameSpace = matches.get(matchId);
      if (!gameSpace) {
        logger.error(`Game space not found for match ID ${matchId}`);
        return;
      }
      gameSpace.updateRacket1Position(playerTypeSchema.enum.PLAYER1, x, y, z);
      console.log(`Racket update received: x=${x}, y=${y}, z=${z}`);
    });
  });
};
