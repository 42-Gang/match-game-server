import { TableType } from './physics/Table.js';
import { PlayerType, playerTypeSchema, scoreSchema } from './game.schema.js';
import { Logger } from 'pino';
import { TypeOf, z } from 'zod';
import { ScoreManager } from './ScoreManager.js';
import { ServeManager } from './ServeManager.js';

export const judgementResultSchema = z.object({
  gameOver: z.boolean().default(false), // 게임이 종료되었는지
  roundOver: z.boolean().default(false), // 라운드가 종료되었는지
  winner: playerTypeSchema.nullable(), // 게임 우승자 (게임이 종료된 경우만 값이 존재)
  winnerId: z.number().optional(), // 우승자의 플레이어 ID (게임이 종료된 경우만 값이 존재)
  loserId: z.number().optional(), // 패자의 플레이어 ID (게임이 종료된 경우만 값이 존재)
  score: scoreSchema, // 현재 스코어
  nextServingPlayer: playerTypeSchema.optional(), // 서브권을 가진 플레이어
});

export enum CollisionTarget {
  TABLE = 'TABLE',
  FLOOR = 'FLOOR',
}

export const collisionDataSchema = z.object({
  currentHitTable: z.nativeEnum(TableType).nullable(), // 마지막으로 공이 맞은 테이블
  previousHitTable: z.nativeEnum(TableType).nullable(), // 이전에 공이 맞은 테이블
  lastHitRacket: z.number().nullable(), // 마지막으로 공을 친 라켓의 플레이어 ID
  target: z.nativeEnum(CollisionTarget),
});

export type JudgementResult = TypeOf<typeof judgementResultSchema>;
export type CollisionData = TypeOf<typeof collisionDataSchema>;

export default class Judgement {
  private scoreManager: ScoreManager;
  private serveManager: ServeManager;

  constructor(
    private readonly player1Id: number,
    private readonly player2Id: number,
    private readonly scoreToWin: number,
    private readonly logger: Logger,
  ) {
    this.scoreManager = new ScoreManager(this.scoreToWin);
    this.serveManager = new ServeManager(logger);
  }

  judgeCollision(data: CollisionData): JudgementResult {
    if (this.scoreManager.isGameOver()) return this.createResult(true);
    let roundOver = false;

    switch (data.target) {
      case CollisionTarget.TABLE:
        if (this.onTableHit(data)) roundOver = true;
        break;
      case CollisionTarget.FLOOR:
        this.onFloorHit(data);
        roundOver = true;
        break;
      default:
        this.logger.warn({ data }, 'Unknown collision target');
    }

    if (this.scoreManager.isGameOver()) {
      this.logger.info(`Game over! Winner: ${this.scoreManager.getWinner()}`);
    }

    return this.createResult(roundOver);
  }

  private onTableHit(data: CollisionData): boolean {
    const { currentHitTable, previousHitTable } = data;
    if (currentHitTable !== previousHitTable || currentHitTable === null) {
      return false;
    }

    const scoringMap: Record<TableType, PlayerType> = {
      [TableType.PLAYER1]: playerTypeSchema.enum.PLAYER2,
      [TableType.PLAYER2]: playerTypeSchema.enum.PLAYER1,
    };

    const scoringPlayer = scoringMap[currentHitTable];

    if (!scoringPlayer) {
      this.logger.warn({ data }, 'Could not determine scoring player from table hit.');
      return false;
    }

    this.updateState(scoringPlayer);
    return true;
  }

  private onFloorHit(data: CollisionData): void {
    const { lastHitRacket, currentHitTable } = data;

    // 경우 1: 라켓에 맞지 않고 바닥에 닿은 경우 (서브 실패 등 / 예외 상황)
    if (lastHitRacket === null) {
      const server = this.serveManager.getServingPlayer();
      let scoringPlayer: PlayerType | null = null;

      // 'else' 없이 득점자 결정
      if (server === playerTypeSchema.enum.PLAYER1) {
        scoringPlayer = playerTypeSchema.enum.PLAYER2;
      }
      if (server === playerTypeSchema.enum.PLAYER2) {
        scoringPlayer = playerTypeSchema.enum.PLAYER1;
      }

      this.logger.info(`Serve error by ${server}. Point to ${scoringPlayer}.`);
      this.updateState(scoringPlayer!);
      return; // 함수를 즉시 종료 (조기 반환)
    }

    // 경우 2: 플레이어 1이 마지막으로 공을 친 경우
    if (lastHitRacket === this.player1Id) {
      // 기본적으로 상대방(P2) 득점으로 설정하고, 특정 조건(성공)일 때만 P1 득점으로 덮어씀
      let scoringPlayer: PlayerType = playerTypeSchema.enum.PLAYER2;
      if (currentHitTable === TableType.PLAYER2) {
        scoringPlayer = playerTypeSchema.enum.PLAYER1;
      }
      this.updateState(scoringPlayer);
      return; // 함수를 즉시 종료 (조기 반환)
    }

    // 경우 3: 플레이어 2가 마지막으로 공을 친 경우
    if (lastHitRacket === this.player2Id) {
      // 기본적으로 상대방(P1) 득점으로 설정하고, 특정 조건(성공)일 때만 P2 득점으로 덮어씀
      let scoringPlayer: PlayerType = playerTypeSchema.enum.PLAYER1;
      if (currentHitTable === TableType.PLAYER1) {
        scoringPlayer = playerTypeSchema.enum.PLAYER2;
      }
      this.updateState(scoringPlayer);
      return; // 함수를 즉시 종료 (조기 반환)
    }

    // 위의 모든 경우에 해당하지 않는 예외적인 상황
    this.logger.warn({ data }, 'Could not determine scoring player from floor hit.');
  }

  private updateState(scoringPlayer: PlayerType): void {
    // ServeManager의 현재 상태 확인
    const isFirstServe = this.serveManager.isFirstServe();

    // 첫 서브 게임인 경우 점수 업데이트는 하지 않고 서브권만 업데이트
    if (isFirstServe) {
      this.logger.info(`First serve game: ${scoringPlayer} won the serve right`);
      this.serveManager.updateServer({
        scoringPlayer,
        player1Score: 0,
        player2Score: 0,
      });
      return;
    }

    // 일반 게임인 경우 점수 및 서브권 모두 업데이트
    this.scoreManager.update(scoringPlayer);
    const scoreDto = this.scoreManager.getScoreDto();

    this.serveManager.updateServer({
      scoringPlayer,
      player1Score: scoreDto.player1Score,
      player2Score: scoreDto.player2Score,
    });

    this.logger.info(`Score updated: P1=${scoreDto.player1Score}, P2=${scoreDto.player2Score}`);
  }

  private createResult(roundOver: boolean): JudgementResult {
    if (this.scoreManager.isGameOver()) {
      const winnerId =
        this.scoreManager.getWinner() === playerTypeSchema.enum.PLAYER1
          ? this.player1Id
          : this.player2Id;
      const loserId =
        this.scoreManager.getWinner() === playerTypeSchema.enum.PLAYER1
          ? this.player2Id
          : this.player1Id;

      return judgementResultSchema.parse({
        gameOver: this.scoreManager.isGameOver(),
        roundOver: true,
        winner: this.scoreManager.getWinner(),
        winnerId,
        loserId,
        score: this.scoreManager.getScoreDto(),
      });
    }
    return judgementResultSchema.parse({
      gameOver: false,
      roundOver,
      winner: null,
      score: this.scoreManager.getScoreDto(),
      nextServingPlayer: this.serveManager.getServingPlayer(),
    });
  }
}
