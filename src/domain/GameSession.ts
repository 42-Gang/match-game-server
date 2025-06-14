import GameSpace from './physics/GameSpace.js';
import Ball from './physics/Ball.js';
import Table from './physics/Table.js';
import Racket from './physics/Racket.js';
import { Server } from 'socket.io';
import { MATCH_SOCKET_EVENTS } from '../network/match.event.js';
import { playerTypeSchema } from './game.schema.js';

export default class GameSession {
  private readonly gameSpaces: Map<number, GameSpace>;

  constructor(private readonly io: Server) {
    this.gameSpaces = new Map<number, GameSpace>();

    this.startLoop();
  }

  private startLoop() {
    const fixedTimeStep = 1 / 60; // 60Hz
    const intervalMs = fixedTimeStep * 1000;

    const timer = setInterval(() => {
      for (const [matchId, gameSpace] of this.gameSpaces.entries()) {
        gameSpace.step(fixedTimeStep);

        const message = {
          ball: gameSpace.getBallPosition(),
          racket1: gameSpace.getRacket1Position(),
          racket2: gameSpace.getRacket2Position(),
        };
        this.io.to(`match:${matchId}`).emit(MATCH_SOCKET_EVENTS.GAME_STATE, message);

        if (gameSpace.getBallPosition().y <= 0) {
          // clearInterval(timer);
          this.gameSpaces.delete(matchId);
        }
      }
    }, intervalMs);
  }

  createGameSpace(input: { matchId: number; player1Id: number; player2Id: number }) {
    if (this.isExist(input.matchId)) {
      throw new Error(`Game space for match ID ${input.matchId} already exists.`);
    }

    const ball = new Ball();
    const table = new Table();
    const racket1 = new Racket(input.player1Id, playerTypeSchema.enum.PLAYER1);
    const racket2 = new Racket(input.player2Id, playerTypeSchema.enum.PLAYER2);
    const gameSpace = new GameSpace(ball, table, racket1, racket2);

    this.gameSpaces.set(input.matchId, gameSpace);
  }

  updateRacketPosition(matchId: number, playerId: number, x: number, y: number, z: number) {
    const gameSpace = this.gameSpaces.get(matchId);
    if (!gameSpace) {
      throw new Error(`Game space for match ID ${matchId} not found.`);
    }

    console.log(
      `Updating racket position for player ${playerId} in match ${matchId}: (${x}, ${y}, ${z})`,
    );
    gameSpace.updateRacketPosition(playerId, x, y, z);
  }

  isExist(matchId: number): boolean {
    return this.gameSpaces.has(matchId);
  }
}
