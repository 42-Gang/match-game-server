import { Server } from 'socket.io';
import { asValue, AwilixContainer } from 'awilix';
import { socketMiddleware } from './utils/middleware.js';

export const registerSocket = (diContainer: AwilixContainer, io: Server) => {
  io.use(socketMiddleware);

  diContainer.register({
    socket: asValue(io),
  });
};
