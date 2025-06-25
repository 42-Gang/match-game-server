import Scores from './Scores.js';
import Score from './Score.js';
import { PlayerType, playerTypeSchema, ScoreDto } from './game.schema.js';

export class ScoreManager {
  private scores: Scores;
  private current: Score;

  constructor() {
    this.scores = new Scores();
    this.current = this.scores.getLatestScore();
  }

  update(scoringPlayer: PlayerType): void {
    const dto = this.current.toScoreDto();
    let { player1score, player2score } = dto;
    if (scoringPlayer === playerTypeSchema.enum.PLAYER1) player1score++;
    if (scoringPlayer === playerTypeSchema.enum.PLAYER2) player2score++;

    const newScore = new Score(player1score, player2score);
    this.scores.addScore(newScore);
    this.current = newScore;
  }

  getScoreDto(): ScoreDto {
    return this.current.toScoreDto();
  }

  isGameOver(): boolean {
    return this.current.isGameOver();
  }

  getWinner(): PlayerType | null {
    return this.current.getWinner();
  }
}
