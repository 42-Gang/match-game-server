import { Socket } from 'socket.io';
import GameSession from '../domain/GameSession.js';

type NextFunction = (err?: Error) => void;

export async function matchMiddleware(socket: Socket, next: NextFunction) {
  const logger = socket.nsp.server.logger;
  try {
    const matchId = socket.handshake.query.matchId;
    if (!matchId || Array.isArray(matchId)) {
      return next(new Error('Invalid match ID format'));
    }

    const userId = socket.data.userId;
    if (!userId) {
      return next(new Error('User ID is required'));
    }

    const parsedMatchId = parseInt(matchId);
    if (isNaN(parsedMatchId)) {
      return next(new Error('Invalid match ID'));
    }

    const gameSession: GameSession =
      socket.nsp.server.diContainer.resolve<GameSession>('gameSession');
    if (!gameSession.getPlayerIds(parsedMatchId).includes(userId)) {
      return next(new Error(`User ${userId} is not part of match ${parsedMatchId}`));
    }

    socket.data.matchId = parsedMatchId;
    next();
  } catch (e) {
    logger.error(e, 'Socket middleware error:');
    next(e as Error);
  }
}
