import PhysicsEngine from './physics/PhysicsEngine.js';
import GameResult from './GameResult.js';
import { playerInputSchema, PlayerInputType, ScoreDto, SessionStateType } from './game.schema.js';
import Judgement from './Judgement.js';

export default class GameSession {
  private readonly dt = 1 / 60;

  constructor(
    private readonly matchId: number,
    private readonly engine: PhysicsEngine,
    private readonly player1Id: number,
    private readonly player2Id: number,
    private readonly judgement: Judgement,
  ) {}

  applyInput(playerId: number, input: PlayerInputType) {
    playerInputSchema.parse(input);

    this.engine.updateRocketPosition(playerId, input.x);
    if (input.swing) {
      this.engine.swingRacket(playerId, input.swing);
    }
  }

  tick(): SessionStateType | GameResult {
    this.engine.step(this.dt);
    return this.getState();
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

  // isPointOver(): boolean {
  //   // 1점이 끝났는지에 대한 로직은 필요에 따라 수정
  //   // 예시: 점수가 추가된 경우 1점 종료로 간주
  //   return this.score.hasWinner();
  // }
  //
  // isGameOver(): boolean {
  //   // 게임 종료 조건(예: 11점 선취 등)
  //   return this.score.hasWinner();
  // }

  getScore(): ScoreDto {
    const score = this.judgement.getCurrentScore();
    return score.toScoreDto();
  }
}
