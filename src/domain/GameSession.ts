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
    this.engine.step(this.dt);
  }

  getState(): SessionStateType {
    const ballPos = this.engine.getBallPosition();
    const rocket1Pos = this.engine.getRacket1Position();
    const rocket2Pos = this.engine.getRacket2Position();

    return {
      ball: ballPos,
      racket1: rocket1Pos,
      racket2: rocket2Pos,
    };
  }

  // TODO: 결과 반환 메서드 구현
  // getResult(): GameResult {
  //
  // }

  getMatchId(): number {
    return this.matchId;
  }

  getScore(): ScoreDto {
    const score = this.judgement.getCurrentScore();
    return score.toScoreDto();
  }
}
