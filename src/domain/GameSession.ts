import PhysicsEngine from './physics/PhysicsEngine.js';
import Ball from './physics/Ball.js';
import Racket, { SwingType } from './physics/Racket.js';
import Table from './physics/Table.js';
import Player, { PlayerInput } from './Player.js';
import Score from './Score.js';
import Judgement from './Judgement.js';
import GameResult from './GameResult.js';
import type { Vec3 } from 'cannon-es';
import Players from './Players.js';

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
    private readonly rackets: Map<string, Racket>,
    private readonly score: Score,
    private readonly judgement: Judgement,
  ) {}

  applyInput(playerId: string, input: PlayerInput) {
    const racket = this.rackets.get(playerId);
    if (!racket) return;
    racket.updatePosition(input.x);
    if (input.swing === 'LEFT') racket.swing('BACKSWING');
    else if (input.swing === 'RIGHT') racket.swing('DRIVE');
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
