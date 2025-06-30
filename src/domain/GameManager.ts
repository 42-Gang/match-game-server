import GameSpace, { CollisionEvent, CollisionEventType } from './physics/GameSpace.js';
import Judgement, { CollisionTarget, JudgementResult } from './Judgement.js';
import { BroadcastOperator, DefaultEventsMap } from 'socket.io';
import { BaseLogger } from 'pino';
import { PlayerType, playerTypeSchema } from './game.schema.js';
import { MATCH_SOCKET_EVENTS } from '../network/match.event.js';
import { socketCountDownSchema } from '../network/schemas/count-down.socket.schema.js';
import Ball from './physics/Ball.js';
import { socketGameEndSchema } from '../network/schemas/game-end.socket.schema.js';

export enum GameStatus {
  WAITING_FOR_PLAYERS, // 두 유저가 모두 접속하지 않은 경우
  STANDBY, // 게임이 시작되기 전 대기 상태
  COUNTDOWN, // 라운드 시작 전 카운트다운
  READY, // 카운트다운 후 준비 상태
  PLAYING, // 실제 탁구 게임 진행 중
  ROUND_OVER, // 한 라운드가 끝나고 점수 등을 표시하는 상태
  GAME_OVER, // 게임이 종료된 상태 (세션 정리 필요)
}

export default class GameManager {
  private readonly COUNTDOWN_SECONDS: number = 3;
  private status: GameStatus = GameStatus.WAITING_FOR_PLAYERS;
  private countdownInterval: NodeJS.Timeout | null = null;

  constructor(
    private readonly gameSpace: GameSpace,
    private readonly ball: Ball, // Judgement에 필요하여 참조 유지
    private readonly logger: BaseLogger,
    private readonly judgement: Judgement,
    private readonly socketRoom: BroadcastOperator<DefaultEventsMap, unknown>,
    private readonly player1Id: number,
    private readonly player2Id: number,
  ) {
    this.gameSpace.onCollisionEvent((event) => this.handleCollision(event));
  }

  public initializeGame() {
    this.status = GameStatus.STANDBY;

    this.gameSpace.reset(playerTypeSchema.enum.PLAYER1);
    this.logger.info('게임 초기화: 게임 공간 리셋 및 상태 설정');
  }

  public update(dt: number): void {
    if (!this.isGameReadyOrPlaying()) {
      return;
    }

    this.gameSpace.step(dt);
  }

  private handleCollision(event: CollisionEvent) {
    switch (event.type) {
      case CollisionEventType.BALL_RACKET:
        if (!event.racket) {
          this.logger.error('충돌 이벤트에 랙켓 정보가 없습니다.');
          return;
        }
        this.ball.recordRacketCollision(event.racket.getPlayerId());
        if (this.status === GameStatus.READY) {
          this.startGame();
          this.logger.info('게임 시작: 랙켓 충돌로 인해 상태 변경');
        }
        break;

      case CollisionEventType.BALL_TABLE:
        if (!event.table) {
          this.logger.error('충돌 이벤트에 테이블 정보가 없습니다.');
          return;
        }
        this.ball.recordTableCollision(event.table.getTableType());
        const tableJudgeCollision = this.judgement.judgeCollision({
          target: CollisionTarget.TABLE,
          lastHitRacket: this.ball.getLastRacketPlayerId(),
          currentHitTable: this.ball.getCurrentHitTable(),
          previousHitTable: this.ball.getPreviousHitTable(),
        });
        this.logger.debug(tableJudgeCollision, '충돌 판정 결과 (테이블 충돌)');
        this.processRoundResult(tableJudgeCollision);
        break;

      case CollisionEventType.BALL_FLOOR:
        this.status = GameStatus.ROUND_OVER;
        const floorJudgeCollision = this.judgement.judgeCollision({
          target: CollisionTarget.FLOOR,
          lastHitRacket: this.ball.getLastRacketPlayerId(),
          currentHitTable: this.ball.getCurrentHitTable(),
          previousHitTable: this.ball.getPreviousHitTable(),
        });
        this.logger.debug(floorJudgeCollision, '충돌 판정 결과 (바닥 충돌)');
        this.processRoundResult(floorJudgeCollision);
        break;
    }
  }

  public getGameObjectsPositions() {
    return this.gameSpace.getGameObjectsPositions();
  }

  private startGame() {
    this.status = GameStatus.PLAYING;
    this.gameSpace.activateGravity();
    this.logger.info('게임시작: 중력 활성화');
  }

  private processRoundResult(judgeResult: JudgementResult) {
    if (judgeResult.gameOver) {
      this.logger.info(`게임 종료: 승자 - ${judgeResult.winner}`);

      const { player1Score, player2Score } = judgeResult.score;
      this.socketRoom.emit(MATCH_SOCKET_EVENTS.MATCH_SCORE, { player1Score, player2Score });
      this.socketRoom.emit(
        MATCH_SOCKET_EVENTS.GAME_END,
        socketGameEndSchema.parse({
          winner: judgeResult.winner,
          winnerId:
            judgeResult.winner === playerTypeSchema.enum.PLAYER1 ? this.player1Id : this.player2Id,
        }),
      );
      this.status = GameStatus.GAME_OVER;

      setTimeout(() => {
        this.socketRoom.disconnectSockets();
        this.logger.info('모든 소켓 연결 해제');
      }, 3000);
      return;
    }

    if (judgeResult.roundOver) {
      if (!judgeResult.nextServingPlayer) {
        throw new Error('다음 서빙 플레이어가 지정되지 않았습니다.');
      }
      const { player1Score, player2Score } = judgeResult.score;
      this.socketRoom.emit(MATCH_SOCKET_EVENTS.MATCH_SCORE, { player1Score, player2Score });
      this.prepareForNextRound(judgeResult.nextServingPlayer);
      return;
    }
  }

  public prepareForNextRound(nextServingPlayer: PlayerType) {
    this.status = GameStatus.STANDBY;
    this.gameSpace.reset(nextServingPlayer);
    this.startCountDown();
  }

  public updateRacketPosition(playerId: number, x: number, y: number, z: number) {
    if (this.isGameReadyOrPlaying()) {
      this.gameSpace.updateRacketPosition(playerId, x, y, z);
    }
  }

  public isGameReadyOrPlaying(): boolean {
    return this.status === GameStatus.READY || this.status === GameStatus.PLAYING;
  }

  private startCountDown() {
    if (this.status !== GameStatus.STANDBY) {
      this.logger.error('카운트다운을 시작할 수 없습니다. 현재 상태:', this.status);
      return;
    }

    this.status = GameStatus.COUNTDOWN;
    let countdown = this.COUNTDOWN_SECONDS;

    this.countdownInterval = setInterval(() => {
      this.logger.info(`카운트다운: ${countdown}초`);

      this.socketRoom.emit(
        MATCH_SOCKET_EVENTS.COUNTDOWN,
        socketCountDownSchema.parse({
          count: countdown,
        }),
      );

      if (countdown <= 0) {
        this.status = GameStatus.READY;
        this.clearCountDown();
        return;
      }
      countdown--;
    }, 1000);
  }

  public clearCountDown() {
    if (!this.countdownInterval) {
      return;
    }

    clearInterval(this.countdownInterval);
    this.countdownInterval = null;
    this.logger.info('Countdown cleared');
  }
}
