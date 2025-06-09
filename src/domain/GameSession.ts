import PhysicsEngine from './physics/PhysicsEngine.js';
import Ball from './physics/Ball.js';
import Racket from './physics/Racket.js';
import Table from './physics/Table.js';
import GameResult from './GameResult.js';
import { playerInputSchema, PlayerInputType, ScoreDto, SessionStateType } from './game.schema.js';
import Judgement from './Judgement.js';

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
    private readonly judgement: Judgement,
  ) {}

  applyInput(playerId: number, input: PlayerInputType) {
    playerInputSchema.parse(input);

    const racket = this.getRacketByPlayerId(playerId);

    racket.updatePosition(input.x);
    if (input.swing) {
      racket.swing(input.swing);
    }
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

  private getRacketByPlayerId(playerId: number): Racket {
    if (this.player1Id === playerId) {
      return this.rocket1;
    }
    if (this.player2Id === playerId) {
      return this.rocket2;
    }
    throw new Error(`Player with ID ${playerId} does not have a racket.`);
  }
}
