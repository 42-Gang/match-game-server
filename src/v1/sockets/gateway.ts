import { Server } from 'socket.io';
import { asValue, AwilixContainer } from 'awilix';
import { socketMiddleware } from './utils/middleware.js';
import { startGameNamespace } from './game/game.namespace.js';

export const registerSocketGateway = (diContainer: AwilixContainer, io: Server) => {
  io.use(socketMiddleware);

  const gameNamespace = io.of('/game');

  diContainer.register({
    waitingNamespace: asValue(gameNamespace),
  });

  startGameNamespace(gameNamespace);
};
