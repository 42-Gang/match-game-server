import { PlayerType, playerTypeSchema, ScoreDto } from './game.schema.js';

export default class Score {
  constructor(
    private readonly player1score: number,
    private readonly player2score: number,
    private readonly scoreToWin: number,
  ) {
    if (player1score < 0 || player2score < 0) {
      throw new Error('Scores cannot be negative');
    }
    if (scoreToWin <= 0) {
      throw new Error('Score to win must be a positive number');
    }
  }

  toScoreDto(): ScoreDto {
    return {
      player1Score: this.player1score,
      player2Score: this.player2score,
    };
  }

  isGameOver(): boolean {
    if (this.scoreToWin <= this.player1score || this.scoreToWin <= this.player2score) {
      return 2 <= Math.abs(this.player1score - this.player2score);
    }

    return false;
  }

  getWinner(): PlayerType {
    if (!this.isGameOver()) {
      throw new Error('Game is not over yet');
    }

    if (this.player1score > this.player2score) {
      return playerTypeSchema.enum.PLAYER1;
    }
    if (this.player1score < this.player2score) {
      return playerTypeSchema.enum.PLAYER2;
    }
    throw new Error('Scores are tied, no winner');
  }
}
