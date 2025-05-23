import { createServer, Server } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { redis } from './plugins/redis.js';
import closeWithGrace from 'close-with-grace';

function registerSocketServer() {
  const httpServer = createServer();
  const io = new SocketIOServer(httpServer);

  io.on('connection', (socket) => {});
  return { httpServer, io };
}

function startServer(server: Server) {
  server.listen(process.env.PORT, () => {
    console.log(`Match Game Server running on port ${process.env.PORT}`);
  });
}

async function configureServer() {
  // 서버 정보 Redis에 등록
  await redis.hSet(`match-server:${process.env.SERVER_NAME}`, {
    serverName: process.env.SERVER_NAME,
    updatedAt: Date.now(),
  });
  await redis.sAdd('match-server:active', process.env.SERVER_NAME);

  await redis.expire(`match-server:${process.env.SERVER_NAME}`, 60 * 11);
  await redis.expire('match-server:active', 60 * 10);

  setInterval(
    () => {
      redis.hSet(`match-server:${process.env.SERVER_NAME}`, {
        updatedAt: Date.now(),
      });
      redis.expire(`match-server:${process.env.SERVER_NAME}`, 60 * 11);
    },
    10 * 60 * 1000,
  );
}

export async function setupGracefulShutdown(server: Server, socket: SocketIOServer) {
  closeWithGrace(
    {
      delay: Number(process.env.CLOSE_GRACE_PERIOD) || 500,
    },
    async ({ err }) => {
      if (err != null) {
        console.log(err);
      }

      server.close();
      await socket.close();

      await redis.sRem('match-server:active', process.env.SERVER_NAME);
      await redis.del(`match-server:${process.env.SERVER_NAME}`);
      await redis.quit();
    },
  );
}

async function init() {
  const { httpServer, io } = registerSocketServer();
  await configureServer();

  startServer(httpServer);
  await setupGracefulShutdown(httpServer, io); // 서버 종료 시그널 핸들러 등록
}

init();
