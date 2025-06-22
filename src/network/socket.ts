import { Server } from 'socket.io';
import { asValue, AwilixContainer } from 'awilix';
import { socketMiddleware } from './utils/middleware.js';
import { matchMiddleware } from './match.middleware.js';
import GameSession from '../domain/GameSession.js';
import { MATCH_SOCKET_EVENTS } from './match.event.js';
import { socketPlayerIdSchema } from './schemas/player-id.socket.schema.js';

export const registerSocket = (diContainer: AwilixContainer, io: Server) => {
  io.use(socketMiddleware);
  io.use(matchMiddleware);

  diContainer.register({
    io: asValue(io),
  });

  const gameSession: GameSession = diContainer.resolve<GameSession>('gameSession');

  io.on('connection', (socket) => {
    const logger = io.logger;
    const playerId = socket.data.userId;
    const matchId = socket.data.matchId;

    socket.join(`match:${matchId}`);
    logger.info(
      `New connection: ${socket.id} from user ${socket.data.userId} joined match ${matchId}`,
    );

    gameSession.playerConnected(matchId, playerId);
    socket
      .to(`match:${matchId}`)
      .emit(MATCH_SOCKET_EVENTS.PLAYER_CONNECTED, socketPlayerIdSchema.parse({ playerId }));
    socket.on(MATCH_SOCKET_EVENTS.RACKET, (data) => {
      const { x, y, z } = data;
      if (!gameSession.isExist(matchId)) {
        logger.error(`Match ${matchId} does not exist for player ${playerId}`);
        return;
      }
      gameSession.updateRacketPosition(matchId, playerId, x, y, z);
    });

    socket.on('disconnect', () => {
      logger.info(`User ${playerId} disconnected from match ${matchId}`);

      gameSession.playerDisconnected(matchId, playerId);
      socket.to(`match:${matchId}`).emit(
        MATCH_SOCKET_EVENTS.PLAYER_DISCONNECTED,
        socketPlayerIdSchema.parse({
          playerId,
        }),
      );
      socket.leave(`match:${matchId}`);
    });
  });
};
