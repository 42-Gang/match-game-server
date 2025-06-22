import GameSpace from './physics/GameSpace.js';
import Ball from './physics/Ball.js';
import Table, { TableType } from './physics/Table.js';
import Racket from './physics/Racket.js';
import { Server } from 'socket.io';
import { MATCH_SOCKET_EVENTS } from '../network/match.event.js';
import { playerTypeSchema } from './game.schema.js';
import { Logger } from 'pino';
import { socketCountDownSchema } from '../network/schemas/count-down.socket.schema.js';
import { socketMatchTimeoutSchema } from '../network/schemas/match-timout.socket.schema.js';

interface GameSessionInfo {
  gameSpace: GameSpace;
  player1Connected: boolean;
  player2Connected: boolean;
  player1Id: number;
  player2Id: number;
  isGameStarted: boolean;
  countdownStarted: boolean;
  countdownIntervalId: NodeJS.Timeout | null;
  waitingIntervalId: NodeJS.Timeout | null;
  playerWaitedTime: number;
}

export default class GameSession {
  private readonly gameSessions: Map<number, GameSessionInfo>;
  private readonly PLAYER_WAITING_TIMEOUT = 30 * 1000;
  private readonly INITIAL_WAITING_TIMEOUT = 120 * 1000;
  private readonly COUNTDOWN_SECONDS = 3;

  constructor(
    private readonly io: Server,
    private readonly logger: Logger,
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
        if (!sessionInfo.isGameStarted) continue;

        const gameSpace = sessionInfo.gameSpace;
        gameSpace.step(fixedTimeStep);

        const message = {
          ball: gameSpace.getBallPosition(),
          racket1: gameSpace.getRacket1Position(),
          racket2: gameSpace.getRacket2Position(),
        };
        this.io.to(`match:${matchId}`).emit(MATCH_SOCKET_EVENTS.GAME_STATE, message);

        this.logger.debug(gameSpace.getBallCollisionData(), 'BallCollisionData:');
        this.logger.debug(gameSpace.getBallLastRacketPlayerId(), 'LastRacketPlayerId:');
        this.logger.debug(gameSpace.getBallLastTableType(), 'LastTableType:');

        if (gameSpace.getBallPosition().y <= 0) {
          this.cleanupMatchSession(matchId);
          this.gameSessions.delete(matchId);
        }
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

  createGameSpace(input: {
    tournamentId: number;
    matchId: number;
    player1Id: number;
    player2Id: number;
  }) {
    if (this.isExist(input.matchId)) {
      throw new Error(`Game space for match ID ${input.matchId} already exists.`);
    }
    this.logger.info(`Creating game space for match ID ${input.matchId}`);

    const ball = new Ball();
    // 두 개의 테이블 생성 (플레이어 1, 플레이어 2 측)
    const tablePlayer1 = new Table(TableType.PLAYER1);
    const tablePlayer2 = new Table(TableType.PLAYER2);
    const racket1 = new Racket(input.player1Id, playerTypeSchema.enum.PLAYER1);
    const racket2 = new Racket(input.player2Id, playerTypeSchema.enum.PLAYER2);
    const gameSpace = new GameSpace(ball, tablePlayer1, tablePlayer2, racket1, racket2);

    this.gameSessions.set(input.matchId, {
      gameSpace,
      player1Connected: false,
      player2Connected: false,
      player1Id: input.player1Id,
      player2Id: input.player2Id,
      isGameStarted: false,
      countdownStarted: false,
      countdownIntervalId: null,
      waitingIntervalId: this.startInitialWaitingTimeout(input.matchId),
      playerWaitedTime: 0,
    });
  }

  updateRacketPosition(matchId: number, playerId: number, x: number, y: number, z: number) {
    const sessionInfo = this.gameSessions.get(matchId);
    if (!sessionInfo) {
      this.logger.error(`GameSession: Game space for match ID ${matchId} not found.`);
      throw new Error(`GameSession: Game space for match ID ${matchId} not found.`);
    }

    sessionInfo.gameSpace.updateRacketPosition(playerId, x, y, z);
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
    } else if (playerId === sessionInfo.player2Id) {
      sessionInfo.player2Connected = true;
      this.logger.info(`Player 2 (${playerId}) connected to match ${matchId}`);
    }

    if (sessionInfo.waitingIntervalId) {
      clearInterval(sessionInfo.waitingIntervalId);
      sessionInfo.waitingIntervalId = null;
    }

    if (sessionInfo.player1Connected !== sessionInfo.player2Connected) {
      sessionInfo.waitingIntervalId = this.startSinglePlayerWaitingInterval(matchId);
    }

    this.checkAndStartCountdown(matchId);
  }

  playerDisconnected(matchId: number, playerId: number): void {
    const sessionInfo = this.gameSessions.get(matchId);
    if (!sessionInfo) {
      return;
    }

    if (sessionInfo.countdownIntervalId) {
      clearInterval(sessionInfo.countdownIntervalId);
      sessionInfo.countdownIntervalId = null;
      sessionInfo.countdownStarted = false;
    }

    if (playerId === sessionInfo.player1Id) {
      sessionInfo.player1Connected = false;
      this.logger.info(`Player 1 (${playerId}) disconnected from match ${matchId}`);
    } else if (playerId === sessionInfo.player2Id) {
      sessionInfo.player2Connected = false;
      this.logger.info(`Player 2 (${playerId}) disconnected from match ${matchId}`);
    }

    if (sessionInfo.isGameStarted) {
      return;
    }

    if (sessionInfo.waitingIntervalId) {
      clearInterval(sessionInfo.waitingIntervalId);
      sessionInfo.waitingIntervalId = null;
    }

    if (sessionInfo.player1Connected || sessionInfo.player2Connected) {
      sessionInfo.waitingIntervalId = this.startSinglePlayerWaitingInterval(matchId);
      return;
    }
    sessionInfo.waitingIntervalId = this.startEmptySessionCleanupTimeout(matchId);
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

    return setInterval(() => {
      const sessionInfo = this.gameSessions.get(matchId);
      if (!sessionInfo) {
        this.logger.error(`GameSession: Game space for match ID ${matchId} not found.`);
        return;
      }

      sessionInfo.playerWaitedTime += 1;
      if (sessionInfo.playerWaitedTime * 1000 < this.PLAYER_WAITING_TIMEOUT) {
        const waitingForPlayerId = sessionInfo.player1Connected
          ? sessionInfo.player2Id
          : sessionInfo.player1Id;
        this.logger.info(
          `Waiting for player ${waitingForPlayerId} in match ${matchId}. Current waiting time: ${sessionInfo.playerWaitedTime} seconds`,
        );

        this.io.to(`match:${matchId}`).emit(MATCH_SOCKET_EVENTS.WAITING_FOR_PLAYER, {
          waitingForPlayerId,
          currentWaitingTimeInSeconds: sessionInfo.playerWaitedTime,
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

  private startEmptySessionCleanupTimeout(matchId: number): NodeJS.Timeout {
    return setTimeout(() => {
      const sessionInfo = this.gameSessions.get(matchId);
      if (!sessionInfo) return;

      if (!sessionInfo.player1Connected && !sessionInfo.player2Connected) {
        this.logger.info(
          `Match ${matchId} cleanup: All players disconnected for ${this.PLAYER_WAITING_TIMEOUT / 1000} seconds`,
        );
        this.cleanupMatchSession(matchId);
      }
    }, this.PLAYER_WAITING_TIMEOUT);
  }

  private cleanupMatchSession(matchId: number): void {
    const sessionInfo = this.gameSessions.get(matchId);
    if (!sessionInfo) return;

    if (sessionInfo.waitingIntervalId) {
      clearInterval(sessionInfo.waitingIntervalId);
    }
    if (sessionInfo.countdownIntervalId) {
      clearInterval(sessionInfo.countdownIntervalId);
    }

    this.gameSessions.delete(matchId);
    this.logger.info(`Match session ${matchId} has been cleaned up`);
  }

  private checkAndStartCountdown(matchId: number): void {
    const sessionInfo = this.gameSessions.get(matchId);
    if (!sessionInfo) return;

    if (
      sessionInfo.player1Connected &&
      sessionInfo.player2Connected &&
      !sessionInfo.countdownStarted
    ) {
      sessionInfo.countdownStarted = true;
      this.logger.info(`Both players connected for match ${matchId}. Starting countdown.`);
      this.startCountdown(matchId);
    }
  }

  private startCountdown(matchId: number): void {
    const sessionInfo = this.gameSessions.get(matchId);
    if (!sessionInfo) {
      this.logger.error(`GameSession: Game space for match ID ${matchId} not found.`);
      return;
    }

    let countdown = this.COUNTDOWN_SECONDS;
    sessionInfo.countdownStarted = true;

    const countdownIntervalId = setInterval(() => {
      const sessionInfo = this.gameSessions.get(matchId);
      if (!sessionInfo || !sessionInfo.player1Connected || !sessionInfo.player2Connected) {
        clearInterval(countdownIntervalId);

        this.logger.info(`Countdown cancelled for match ${matchId}: Player disconnected`);
        this.io.to(`match:${matchId}`).emit(MATCH_SOCKET_EVENTS.COUNTDOWN_CANCELLED);
        return;
      }

      this.io
        .to(`match:${matchId}`)
        .emit(MATCH_SOCKET_EVENTS.COUNTDOWN, socketCountDownSchema.parse({ count: countdown }));
      this.logger.info(`Countdown for match ${matchId}: ${countdown}`);
      countdown -= 1;

      if (countdown < 0) {
        clearInterval(countdownIntervalId);
        this.startGame(matchId);
      }
    }, 1000);

    sessionInfo.countdownIntervalId = countdownIntervalId;
  }

  private startGame(matchId: number): void {
    const sessionInfo = this.gameSessions.get(matchId);
    if (!sessionInfo) return;

    sessionInfo.isGameStarted = true;
    this.logger.info(`Game started for match ${matchId}`);
    this.io.to(`match:${matchId}`).emit(MATCH_SOCKET_EVENTS.GAME_START);
  }
}
