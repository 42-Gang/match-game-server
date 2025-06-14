import { Server } from 'socket.io';
import { asValue, AwilixContainer } from 'awilix';
import { socketMiddleware } from './utils/middleware.js';
import { matchMiddleware } from './match.middleware.js';
import GameSession from '../domain/GameSession.js';
import { MATCH_SOCKET_EVENTS } from './match.event.js';

export const registerSocket = (diContainer: AwilixContainer, io: Server) => {
  io.use(socketMiddleware);
  io.use(matchMiddleware);

  diContainer.register({
    io: asValue(io),
  });

  io.on('connection', (socket) => {
    const gameSession: GameSession = diContainer.resolve<GameSession>('gameSession');
    const logger = io.logger;
    const playerId = socket.data.userId;
    const matchId = socket.data.matchId;

    socket.join(`match:${matchId}`);
    logger.info(
      `New connection: ${socket.id} from user ${socket.data.userId} joined match ${matchId}`,
    );

    socket.on(MATCH_SOCKET_EVENTS.RACKET, (data) => {
      const { x, y, z } = data;
      gameSession.updateRacketPosition(matchId, playerId, x, y, z);
    });

    socket.on('disconnect', () => {
      logger.info(`User ${playerId} disconnected from match ${matchId}`);
      socket.leave(`match:${matchId}`);
    });
  });
};
