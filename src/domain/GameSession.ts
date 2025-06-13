import GameSpace from './physics/GameSpace.js';
import { ScoreDto, SessionStateType } from './game.schema.js';
import Players from './Players.js';

export default class GameSession {
  private readonly dt = 1 / 60;

  constructor(
    private readonly matchId: number,
    private readonly engine: GameSpace,
    private readonly players: Players,
  ) {}

  tick(): void {
    // 물리 엔진을 한 스텝 진행합니다.
    this.engine.step(this.dt);
  }

  getState(): SessionStateType {
    return {
      ball: this.engine.getBallPosition(),
      racket1: this.engine.getRacket1Position(),
      racket2: this.engine.getRacket2Position(),
    };
  }

  getMatchId(): number {
    return this.matchId;
  }
}
