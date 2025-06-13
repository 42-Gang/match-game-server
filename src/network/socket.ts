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

  const gameSession = new GameSession(io);

  // 임시 게임 세션 생성
  gameSession.createGameSpace({
    matchId: 4,
    player1Id: 111,
    player2Id: 222,
  });

  io.on('connection', (socket) => {
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
