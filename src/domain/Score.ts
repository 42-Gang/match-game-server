import { PlayerType, playerTypeSchema, ScoreDto } from './game.schema.js';

export default class Score {
  constructor(
    private readonly player1score: number,
    private readonly player2score: number,
  ) {
    if (player1score < 0 || player2score < 0) {
      throw new Error('Scores cannot be negative');
    }
    if (player1score > 11 || player2score > 11) {
      throw new Error('Scores cannot exceed 11');
    }
    if (player1score === player2score) {
      throw new Error('Scores cannot be equal');
    }
    if (Math.abs(player1score - player2score) < 2) {
      throw new Error('Score difference must be at least 2');
    }
  }

  toScoreDto(): ScoreDto {
    return {
      player1score: this.player1score,
      player2score: this.player2score,
    };
  }

  getWinner(): PlayerType {
    if (this.player1score > this.player2score) {
      return playerTypeSchema.enum.PLAYER1;
    }
    if (this.player1score < this.player2score) {
      return playerTypeSchema.enum.PLAYER2;
    }

    throw new Error('No winner yet');
  }
}
