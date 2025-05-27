import { Namespace, Socket } from 'socket.io';
import { socketMiddleware } from '../utils/middleware.js';

export function startGameNamespace(namespace: Namespace) {
  namespace.use(socketMiddleware);

  namespace.on('connection', async (socket: Socket) => {
    const logger = namespace.server.logger;
    const userId = socket.data.userId;

    logger.info(`🟢 [/game] Connected: ${socket.id} ${userId}`);

    socket.on('disconnect', () => {
      logger.info(`🔴 [/game] Disconnected: ${socket.id}`);
    });

    socket.on('error', (error: Error) => {
      logger.error(error, `Error in game namespace (${socket.id}):`);
    });
  });
}
