import PhysicsEngine from './physics/PhysicsEngine.js';
import { playerInputSchema, PlayerInputType, ScoreDto, SessionStateType } from './game.schema.js';
import Judgement from './Judgement.js';
import Players from './Players.js';

export default class GameSession {
  private readonly dt = 1 / 60;

  constructor(
    private readonly matchId: number,
    private readonly engine: PhysicsEngine,
    private readonly players: Players,
    private readonly judgement: Judgement,
  ) {}

  applyInput(playerId: number, input: PlayerInputType) {
    playerInputSchema.parse(input);

    this.engine.updateRocketPosition(playerId, input.x);
    if (input.swing) {
      this.engine.swingRacket(playerId, input.swing);
    }
  }

  tick(): void {
    // 물리 엔진을 한 스텝 진행합니다.
    this.engine.step(this.dt);

    // 볼 위치를 판정하고, 득점이 있으면 볼을 리셋합니다.
    const winner = this.judgement.judgeBallPosition(this.getState());
    if (winner) {
      // PhysicsEngine 쪽에 reset 메서드가 있다면 호출해주세요.
      // 예: this.engine.resetBall();
    }
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

  getScore(): ScoreDto {
    return this.judgement.getCurrentScore().toScoreDto();
  }
}
