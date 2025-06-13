import { Server } from 'socket.io';
import { asValue, AwilixContainer } from 'awilix';
import { socketMiddleware } from './utils/middleware.js';
import Ball from '../domain/physics/Ball.js';
import Table from '../domain/physics/Table.js';
import Racket from '../domain/physics/Racket.js';
import GameSpace from '../domain/physics/GameSpace.js';
import { playerTypeSchema } from '../domain/game.schema.js';
import { matchMiddleware } from './match.middleware.js';

function createGameSpace(playerId: number) {
  const ball = new Ball();
  const table = new Table();
  const racket1 = new Racket(playerTypeSchema.enum.PLAYER1);
  const racket2 = new Racket(playerTypeSchema.enum.PLAYER2);
  return new GameSpace(ball, table, racket1, racket2, playerId);
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
        racket2: gameSpace.getRacket2Position(),
      };
      io.to(`match:${matchId}`).emit('game:update', message);

      if (gameSpace.getBallPosition().y <= 0) {
        clearInterval(timer);
      }
    }
  }, intervalMs);

  function joinMatch(matchId: number, playerId: number) {
    if (!matches.has(matchId)) {
      matches.set(matchId, createGameSpace(playerId));
      return;
    }

    const match = matches.get(matchId);
    if (!match) {
      io.logger.error(`Match not found for ID ${matchId}`);
      return;
    }
    match.setPlayer2Id(playerId);
  }

  io.on('connection', (socket) => {
    const logger = io.logger;
    const playerId = socket.data.userId;
    const matchId = socket.data.matchId;

    socket.join(`match:${matchId}`);
    logger.info(`New connection: ${socket.id} from user ${socket.data.userId}`);

    joinMatch(matchId, playerId);

    socket.on('racket:update', (data) => {
      const { x, y, z } = data;
      const gameSpace = matches.get(matchId);
      if (!gameSpace) {
        logger.error(`Game space not found for match ID ${matchId}`);
        return;
      }

      gameSpace.updateRacketPosition(playerId, x, y, z);
      if (playerId === 222)
        console.log(`User ${playerId} racket update received: x=${x}, y=${y}, z=${z}`);
    });
  });
};
