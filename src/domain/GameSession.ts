import { Server } from 'socket.io';
import { MATCH_SOCKET_EVENTS } from '../network/match.event.js';
import { playerTypeSchema } from './game.schema.js';
import { Logger } from 'pino';
import { socketMatchTimeoutSchema } from '../network/schemas/match-timout.socket.schema.js';
import GameManager from './GameManager.js';
import { asValue, AwilixContainer } from 'awilix';

interface GameSessionInfo {
  gameManager: GameManager;
  player1Connected: boolean;
  player2Connected: boolean;
  player1Id: number;
  player2Id: number;
  waitingIntervalId: NodeJS.Timeout | null;
}

export default class GameSession {
  private readonly gameSessions: Map<number, GameSessionInfo>;
  private readonly PLAYER_WAITING_TIMEOUT = 30 * 1000;
  private readonly INITIAL_WAITING_TIMEOUT = 120 * 1000;
  private readonly DISCONNECT_DELAY_MS = 3000;

  constructor(
    private readonly io: Server,
    private readonly logger: Logger,
    private readonly container: AwilixContainer,
  ) {
    this.gameSessions = new Map<number, GameSessionInfo>();
    this.startLoop();
  }

  private startLoop() {
    const fixedTimeStep = 1 / 60; // 60Hz
    const intervalMs = fixedTimeStep * 1000;

    this.logger.info(`Game session started with fixed time step: ${fixedTimeStep} seconds`);
    setInterval(() => {
      for (const [matchId, sessionInfo] of this.gameSessions.entries()) {
        const { gameManager } = sessionInfo;

        if (gameManager.isGameOver()) {
          this.logger.info(`Game over for match ID ${matchId}. Cleaning up session.`);
          this.cleanupMatchSession(matchId);
          continue;
        }

        gameManager.update(fixedTimeStep);
        this.io
          .to(`match:${matchId}`)
          .emit(MATCH_SOCKET_EVENTS.GAME_STATE, gameManager.getGameObjectsPositions());
      }
    }, intervalMs);
  }

  getPlayerIds(matchId: number): number[] {
    const sessionInfo = this.gameSessions.get(matchId);
    if (!sessionInfo) {
      this.logger.error(`GameSession: Game space for match ID ${matchId} not found.`);
      throw new Error(`GameSession: Game space for match ID ${matchId} not found.`);
    }
    return [sessionInfo.player1Id, sessionInfo.player2Id];
  }

  createGameSession(input: {
    tournamentId: number;
    matchId: number;
    player1Id: number;
    player2Id: number;
    scoreToWin: number;
  }) {
    if (this.isExist(input.matchId)) {
      throw new Error(`Game space for match ID ${input.matchId} already exists.`);
    }
    this.logger.info(`Creating game space for match ID ${input.matchId}`);

    const sessionScope = this.container.createScope();
    sessionScope.register({
      player1Id: asValue(input.player1Id),
      player2Id: asValue(input.player2Id),
      scoreToWin: asValue(input.scoreToWin),
      socketRoom: asValue(this.io.to(`match:${input.matchId}`)),
      matchId: asValue(input.matchId),
    });
    const gameManager = sessionScope.resolve<GameManager>('gameManager');

    this.gameSessions.set(input.matchId, {
      gameManager,
      player1Connected: false,
      player2Connected: false,
      player1Id: input.player1Id,
      player2Id: input.player2Id,
      waitingIntervalId: this.startInitialWaitingTimeout(input.matchId),
    });
  }

  updateRacketPosition(matchId: number, playerId: number, x: number, y: number, z: number) {
    const sessionInfo = this.gameSessions.get(matchId);
    if (!sessionInfo) {
      this.logger.error(`GameSession: Game space for match ID ${matchId} not found.`);
      throw new Error(`GameSession: Game space for match ID ${matchId} not found.`);
    }

    sessionInfo.gameManager.updateRacketPosition(playerId, x, y, z);
  }

  isExist(matchId: number): boolean {
    return this.gameSessions.has(matchId);
  }

  playerConnected(matchId: number, playerId: number): void {
    const sessionInfo = this.gameSessions.get(matchId);
    if (!sessionInfo) {
      this.logger.error(`Game session for match ID ${matchId} not found.`);
      return;
    }

    if (playerId === sessionInfo.player1Id) {
      sessionInfo.player1Connected = true;
      this.logger.info(`Player 1 (${playerId}) connected to match ${matchId}`);
    }
    if (playerId === sessionInfo.player2Id) {
      sessionInfo.player2Connected = true;
      this.logger.info(`Player 2 (${playerId}) connected to match ${matchId}`);
    }

    this.logger.info(
      `Players connection: Player 1: ${sessionInfo.player1Connected}, Player 2: ${sessionInfo.player2Connected}`,
    );

    if (sessionInfo.waitingIntervalId) {
      clearInterval(sessionInfo.waitingIntervalId);
      sessionInfo.waitingIntervalId = null;
    }
    if (!sessionInfo.player1Connected || !sessionInfo.player2Connected) {
      sessionInfo.waitingIntervalId = this.startSinglePlayerWaitingInterval(matchId);
    }

    if (sessionInfo.player1Connected && sessionInfo.player2Connected) {
      if (sessionInfo.waitingIntervalId) {
        clearInterval(sessionInfo.waitingIntervalId);
      }

      this.logger.info(`Both players connected for match ${matchId}. Starting game...`);
      sessionInfo.gameManager.initializeGame();
      sessionInfo.gameManager.prepareForNextRound(playerTypeSchema.enum.PLAYER1);
    }
  }

  playerDisconnected(matchId: number, playerId: number): void {
    const sessionInfo = this.gameSessions.get(matchId);
    if (!sessionInfo) {
      return;
    }

    if (playerId === sessionInfo.player1Id) {
      sessionInfo.player1Connected = false;
      this.logger.info(`Player 1 (${playerId}) disconnected from match ${matchId}`);
    }
    if (playerId === sessionInfo.player2Id) {
      sessionInfo.player2Connected = false;
      this.logger.info(`Player 2 (${playerId}) disconnected from match ${matchId}`);
    }
  }

  private startInitialWaitingTimeout(matchId: number): NodeJS.Timeout {
    return setTimeout(() => {
      const sessionInfo = this.gameSessions.get(matchId);
      if (!sessionInfo) return;

      // 아무 플레이어도 접속하지 않은 경우 세션 정리
      if (!sessionInfo.player1Connected && !sessionInfo.player2Connected) {
        this.logger.info(
          `Match ${matchId} timed out: No players connected within ${this.INITIAL_WAITING_TIMEOUT / 1000} seconds`,
        );
        this.cleanupMatchSession(matchId);
      }
    }, this.INITIAL_WAITING_TIMEOUT);
  }

  private startSinglePlayerWaitingInterval(matchId: number): NodeJS.Timeout {
    this.logger.info(`Starting single player waiting timeout for match ${matchId}`);

    let waitedTime = 0;

    return setInterval(() => {
      const sessionInfo = this.gameSessions.get(matchId);
      if (!sessionInfo) {
        this.logger.error(`GameSession: Game space for match ID ${matchId} not found.`);
        return;
      }

      waitedTime += 1;
      if (waitedTime * 1000 < this.PLAYER_WAITING_TIMEOUT) {
        const waitingForPlayerId = sessionInfo.player1Connected
          ? sessionInfo.player2Id
          : sessionInfo.player1Id;
        this.logger.info(
          `Waiting for player ${waitingForPlayerId} in match ${matchId}. Current waiting time: ${waitedTime} seconds`,
        );

        this.io.to(`match:${matchId}`).emit(MATCH_SOCKET_EVENTS.WAITING_FOR_PLAYER, {
          waitingForPlayerId,
          currentWaitingTimeInSeconds: waitedTime,
          timeoutInSeconds: this.PLAYER_WAITING_TIMEOUT / 1000,
        });
        return;
      }

      if (
        (sessionInfo.player1Connected && !sessionInfo.player2Connected) ||
        (!sessionInfo.player1Connected && sessionInfo.player2Connected)
      ) {
        const missingPlayerId = sessionInfo.player1Connected
          ? sessionInfo.player2Id
          : sessionInfo.player1Id;

        this.logger.info(
          `Match ${matchId} timed out: Waiting for player ${missingPlayerId} exceeded ${this.PLAYER_WAITING_TIMEOUT / 1000} seconds`,
        );
        this.io.to(`match:${matchId}`).emit(
          MATCH_SOCKET_EVENTS.MATCH_TIMEOUT,
          socketMatchTimeoutSchema.parse({
            missingPlayerId,
            waitingTimeInSeconds: this.PLAYER_WAITING_TIMEOUT / 1000,
            reason: `Player ${missingPlayerId} did not connect within the time limit`,
          }),
        );

        this.cleanupMatchSession(matchId);
      }
    }, 1000);
  }

  private cleanupMatchSession(matchId: number): void {
    const sessionInfo = this.gameSessions.get(matchId);
    if (!sessionInfo) return;

    const { gameManager, waitingIntervalId } = sessionInfo;
    gameManager.clearCountDown();
    this.cleanWaitingInterval(waitingIntervalId);

    setTimeout(() => {
      this.io.to(`match:${matchId}`).disconnectSockets(true);
      this.logger.info('All socket connections have been disconnected');
    }, this.DISCONNECT_DELAY_MS);

    this.gameSessions.delete(matchId);
    this.logger.info(`Match session ${matchId} has been cleaned up`);
  }

  private cleanWaitingInterval(waitingIntervalId: NodeJS.Timeout | null): void {
    if (!waitingIntervalId) return;

    clearInterval(waitingIntervalId);
    this.logger.info('Waiting interval cleared');
  }
}
