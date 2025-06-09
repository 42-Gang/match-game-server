import PhysicsEngine from './physics/PhysicsEngine.js';
import Ball from './physics/Ball.js';
import Racket from './physics/Racket.js';
import Table from './physics/Table.js';
import Score from './Score.js';
import Judgement from './Judgement.js';
import GameResult from './GameResult.js';
import type { Vec3 } from 'cannon-es';
import { playerInputSchema, PlayerInputType, swingTypeSchema } from './game.schema.js';

export interface SessionState {
  ball: Vec3;
  rackets: Record<string, Vec3>;
  score: Record<string, number>;
}

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

    let racket;
    if (this.player1Id === playerId) {
      racket = this.rocket1;
    }
    if (this.player2Id === playerId) {
      racket = this.rocket2;
    }
    if (!racket) return;

    racket.updatePosition(input.x);
    if (input.swing) racket.swing(input.swing);
  }

  tick(): SessionState | GameResult {
    this.engine.step(this.dt);
    return this.getState();
  }

  getState(): SessionState {
    const ballPos = this.ball.body.position;
    const rackPos: Record<string, Vec3> = {};
    this.rackets.forEach((r, id) => {
      rackPos[id] = r.body.position;
    });
    return {
      ball: ballPos,
      rackets: rackPos,
      score: this.score.getPoints(),
    };
  }
}
