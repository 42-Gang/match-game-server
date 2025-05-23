import { createServer, Server } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { v4 as uuid } from 'uuid';
import { redis } from './plugins/redis.js';
import closeWithGrace from 'close-with-grace';

const serverId = uuid(); // 이 서버의 고유 ID
const PORT = process.env.PORT || 3001;

function registerSocketServer() {
  const httpServer = createServer();
  const io = new SocketIOServer(httpServer);

  io.on('connection', (socket) => {
    console.log('User connected to match-server:', serverId);
    // 게임 로직 처리
  });
  return { httpServer, io };
}

function startServer(server: Server) {
  server.listen(process.env.PORT, () => {
    console.log(`Match Game Server running on port ${PORT}`);
  });
}

async function configureServer() {
  // 서버 정보 Redis에 등록
  await redis.hSet(`match-server:${serverId}`, {
    host: 'localhost',
    port: PORT,
    currentUsers: 0,
    maxUsers: 4,
    updatedAt: Date.now(),
  });
  await redis.sAdd('match-server:active', serverId);
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
      socket.close();

      await redis.sRem('match-server:active', serverId);
      await redis.del(`match-server:${serverId}`);
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
