import { Socket } from 'socket.io';

type NextFunction = (err?: Error) => void;

export async function matchMiddleware(socket: Socket, next: NextFunction) {
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

    // TODO: Add logic to check if the user is a participant in the match

    socket.data.matchId = parsedMatchId;
    next();
  } catch (e) {
    console.error('Socket middleware error:', e);
    next(e as Error);
  }
}
