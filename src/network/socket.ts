import { Server } from 'socket.io';
import { asValue, AwilixContainer } from 'awilix';
import { socketMiddleware } from './utils/middleware.js';
import Ball from '../domain/physics/Ball.js';
import Table from '../domain/physics/Table.js';
import Racket from '../domain/physics/Racket.js';
import CANNON from 'cannon-es';
import GameSpace from '../domain/physics/GameSpace.js';
import { playerTypeSchema } from '../domain/game.schema.js';

export const registerSocket = (diContainer: AwilixContainer, io: Server) => {
  io.use(socketMiddleware);

  diContainer.register({
    socket: asValue(io),
  });

  io.on('connection', (socket) => {
    const logger = io.logger;
    logger.info(`New connection: ${socket.id} from user ${socket.data.userId}`);

    const ball = new Ball();
    const table = new Table();
    const racket1 = new Racket(playerTypeSchema.enum.PLAYER1, new CANNON.Vec3(-0.5, 1, 0));
    const racket2 = new Racket(playerTypeSchema.enum.PLAYER2, new CANNON.Vec3(0.5, 1, 0));
    const gameSpace = new GameSpace(ball, table, racket1, racket2);

    const fixedTimeStep = 1 / 60; // 60Hz
    const intervalMs = fixedTimeStep * 1000;

    const timer = setInterval(() => {
      gameSpace.step(fixedTimeStep);

      const message = {
        ball: gameSpace.getBallPosition(),
        racket1: gameSpace.getRacket1Position(),
      };
      // logger.info(message, `Emitting game update:`);
      socket.emit('game:update', message);

      // 공이 바닥에 닿으면 루프 종료
      if (ball.body.position.y <= 0) {
        clearInterval(timer);
        // 필요하면 여기서 플레이어에게 결과 전송
      }
    }, intervalMs);

    socket.on('racket:update', (data) => {
      const { x, y, z } = data;
      console.log(`Racket update received: x=${x}, y=${y}, z=${z}`);
      gameSpace.updateRacket1Position(playerTypeSchema.enum.PLAYER1, x, y, z);
    });
  });
};
