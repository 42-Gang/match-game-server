import { PlayerType, playerTypeSchema, ScoreDto } from './game.schema.js';

export default class Score {
  constructor(
    private readonly player1score: number,
    private readonly player2score: number,
  ) {
    if (player1score < 0 || player2score < 0) {
      throw new Error('Scores cannot be negative');
    }
  }

  toScoreDto(): ScoreDto {
    return {
      player1score: this.player1score,
      player2score: this.player2score,
    };
  }

  isGameOver(): boolean {
    if (this.player1score < 10 && this.player2score < 10) {
      return false;
    }
    if (Math.abs(this.player1score - this.player2score) < 2) {
      return false;
    }
    return true;
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
