import { PlayerType, playerTypeSchema } from './game.schema.js';
import { BaseLogger } from 'pino';

interface PointResultDto {
  scoringPlayer: PlayerType;
  player1Score: number;
  player2Score: number;
  firstServe?: boolean; // 첫 서브 여부
}

export class ServeManager {
  private server: PlayerType;

  constructor(private readonly logger: BaseLogger) {
    this.server = playerTypeSchema.enum.PLAYER1;
  }

  getNextServer({
    scoringPlayer,
    player1Score,
    player2Score,
    firstServe,
  }: PointResultDto): PlayerType {
    // 첫 서브 상황
    if (firstServe) {
      this.server = scoringPlayer;
      this.logger.info(`First serve completed. Serving player: ${this.server}`);
      return this.server;
    }

    // 듀스 상황
    if (10 <= player1Score && 10 <= player2Score) {
      this.server = this.getOpposite(this.server);
      this.logger.info(`Deuce, serve switched to ${this.server}`);
      return this.server;
    }

    // 일반적인 상황
    const totalScore = player1Score + player2Score;
    if (totalScore % 2 === 0) {
      this.server = this.getOpposite(this.server);
      this.logger.info(`Serve switched to ${this.server}`);
      return this.server;
    }

    this.logger.info(`Serve remains with ${this.server}`);
    return this.server;
  }

  getServingPlayer(): PlayerType {
    return this.server;
  }

  private getOpposite(player: PlayerType): PlayerType {
    if (player === playerTypeSchema.enum.PLAYER1) {
      return playerTypeSchema.enum.PLAYER2;
    }
    if (player === playerTypeSchema.enum.PLAYER2) {
      return playerTypeSchema.enum.PLAYER1;
    }
    throw new Error(`Invalid player type: ${player}`);
  }
}
