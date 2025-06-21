import GameSpace from './physics/GameSpace.js';
import Ball from './physics/Ball.js';
import Table from './physics/Table.js';
import Racket from './physics/Racket.js';
import { Server } from 'socket.io';
import { MATCH_SOCKET_EVENTS } from '../network/match.event.js';
import { playerTypeSchema } from './game.schema.js';
import { Logger } from 'pino';
import { socketCountDownSchema } from '../network/schemas/count-down.socket.schema.js';

interface GameSessionInfo {
  gameSpace: GameSpace;
  player1Connected: boolean;
  player2Connected: boolean;
  player1Id: number;
  player2Id: number;
  isGameStarted: boolean;
  countdownStarted: boolean;
  countdownInterval: NodeJS.Timeout | null;
}

export default class GameSession {
  private readonly gameSessions: Map<number, GameSessionInfo>;

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

        if (gameSpace.getBallPosition().y <= 0) {
          // clearInterval(timer);
          this.gameSessions.delete(matchId);
        }
      }
    }, intervalMs);
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
    const table = new Table();
    const racket1 = new Racket(input.player1Id, playerTypeSchema.enum.PLAYER1);
    const racket2 = new Racket(input.player2Id, playerTypeSchema.enum.PLAYER2);
    const gameSpace = new GameSpace(ball, table, racket1, racket2);

    this.gameSessions.set(input.matchId, {
      gameSpace,
      player1Connected: false,
      player2Connected: false,
      player1Id: input.player1Id,
      player2Id: input.player2Id,
      isGameStarted: false,
      countdownStarted: false,
      countdownInterval: null,
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

    this.checkAndStartCountdown(matchId);
  }

  playerDisconnected(matchId: number, playerId: number): void {
    const sessionInfo = this.gameSessions.get(matchId);
    if (!sessionInfo) {
      return;
    }

    if (sessionInfo.countdownInterval) {
      clearInterval(sessionInfo.countdownInterval);
      sessionInfo.countdownInterval = null;
    }

    if (playerId === sessionInfo.player1Id) {
      sessionInfo.player1Connected = false;
      this.logger.info(`Player 1 (${playerId}) disconnected from match ${matchId}`);
    } else if (playerId === sessionInfo.player2Id) {
      sessionInfo.player2Connected = false;
      this.logger.info(`Player 2 (${playerId}) disconnected from match ${matchId}`);
    }
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
    let countdown = 3;

    const countdownInterval = setInterval(() => {
      const sessionInfo = this.gameSessions.get(matchId);
      this.gameSessions.get(matchId)!.countdownInterval = countdownInterval;
      if (!sessionInfo || !sessionInfo.player1Connected || !sessionInfo.player2Connected) {
        clearInterval(countdownInterval);

        if (sessionInfo) {
          sessionInfo.countdownStarted = false;
        }

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
        clearInterval(countdownInterval);
        this.startGame(matchId);
      }
    }, 1000);
  }

  private startGame(matchId: number): void {
    const sessionInfo = this.gameSessions.get(matchId);
    if (!sessionInfo) return;

    sessionInfo.isGameStarted = true;
    this.logger.info(`Game started for match ${matchId}`);
    this.io.to(`match:${matchId}`).emit(MATCH_SOCKET_EVENTS.GAME_START);
  }
}
