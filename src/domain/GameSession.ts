import PhysicsEngine from './physics/PhysicsEngine.js';
import Ball from './physics/Ball.js';
import Racket from './physics/Racket.js';
import Table from './physics/Table.js';
import Score from './Score.js';
import GameResult from './GameResult.js';
import { playerInputSchema, PlayerInputType, SessionStateType } from './game.schema.js';

export default class GameSession {
  private readonly dt = 1 / 60;

  constructor(
    private readonly matchId: number,
    private readonly engine: PhysicsEngine,
    private readonly ball: Ball,
    private readonly table: Table,
    private readonly rocket1: Racket,
    private readonly rocket2: Racket,
    private readonly player1Id: number,
    private readonly player2Id: number,
    private readonly score: Score,
  ) {}

  applyInput(playerId: number, input: PlayerInputType) {
    playerInputSchema.parse(input);

    const racket = this.getRacketByPlayerId(playerId);

    racket.updatePosition(input.x);
    if (input.swing) {
      racket.swing(input.swing);
    }
  }

  private getRacketByPlayerId(playerId: number): Racket {
    if (this.player1Id === playerId) {
      return this.rocket1;
    }
    if (this.player2Id === playerId) {
      return this.rocket2;
    }
    throw new Error(`Player with ID ${playerId} does not have a racket.`);
  }

  tick(): SessionStateType | GameResult {
    this.engine.step(this.dt);
    return this.getState();
  }

  getState(): SessionStateType {
    const ballPos = this.ball.body.position;
    const rocket1Pos = this.rocket1.body.position;
    const rocket2Pos = this.rocket2.body.position;

    return {
      ball: ballPos,
      racket1: rocket1Pos,
      racket2: rocket2Pos,
    };
  }
}
