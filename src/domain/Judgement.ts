import Score from './Score.js';
import Scores from './Scores.js';
import { SessionStateType, PlayerType, ScoreDto } from './game.schema.js';
import Table from './physics/Table.js';

export default class Judgement {
  private static readonly WINNING_SCORE = 11;

  constructor(private readonly scores: Scores) {
    this.scores.addScore(new Score(0, 0));
  }

  getCurrentScore(): Score {
    return this.scores.getLatestScore();
  }

  judgeBallPosition(state: SessionStateType): { winner: PlayerType | null; score: Score } {
    const ballX = state.ball.x;
    const halfLength = Table.LENGTH / 2;

    // 최신 스코어 분해
    const { player1score: p1, player2score: p2 }: ScoreDto = this.getCurrentScore().toScoreDto(); // toDto()가 없으면 .player1score 등으로 직접 접근
    let winner: PlayerType | null = null;

    if (ballX < -halfLength) {
      // 왼쪽으로 나감 → PLAYER2 득점
      winner = 'PLAYER2';
      this.scores.addScore(new Score(p1, p2 + 1));
    } else if (ballX > halfLength) {
      // 오른쪽으로 나감 → PLAYER1 득점
      winner = 'PLAYER1';
      this.scores.addScore(new Score(p1 + 1, p2));
    }

    return {
      winner,
      score: this.getCurrentScore(),
    };
  }

  isGameOver(): boolean {
    const { player1score: p1, player2score: p2 }: ScoreDto = this.getCurrentScore().toScoreDto();
    const max = Math.max(p1, p2);
    const min = Math.min(p1, p2);

    return max >= Judgement.WINNING_SCORE && max - min >= 2;
  }
}
