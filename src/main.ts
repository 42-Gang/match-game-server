import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createClient } from 'redis';
import { v4 as uuid } from 'uuid';

const serverId = uuid(); // 이 서버의 고유 ID
const PORT = process.env.PORT || 3001;

async function init() {
  const httpServer = createServer();
  const io = new SocketIOServer(httpServer);

  const redis = createClient({ url: 'redis://localhost:6379' });
  await redis.connect();

  // 서버 정보 Redis에 등록
  await redis.hSet(`match-server:${serverId}`, {
    host: 'localhost',
    port: PORT,
    currentUsers: 0,
    maxUsers: 4,
    updatedAt: Date.now(),
  });
  await redis.sAdd('match-server:active', serverId);

  io.on('connection', (socket) => {
    console.log('User connected to match-server:', serverId);
    // 게임 로직 처리
  });

  httpServer.listen(PORT, () => {
    console.log(`Match Game Server running on port ${PORT}`);
  });

  // 서버 종료 시 Redis에서 정보 제거
  process.on('SIGINT', async () => {
    await redis.sRem('match-server:active', serverId);
    await redis.del(`match-server:${serverId}`);
    await redis.quit();
    process.exit();
  });
}

init();
