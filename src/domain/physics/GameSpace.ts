import * as CANNON from 'cannon-es';
import Ball from './Ball.js';
import Table from './Table.js';
import Racket from './Racket.js';
import { BaseLogger } from 'pino';
import Judgement, { CollisionTarget, JudgementResult } from '../Judgement.js';
import { MATCH_SOCKET_EVENTS } from '../../network/match.event.js';
import { socketCountDownSchema } from '../../network/schemas/count-down.socket.schema.js';
import { BroadcastOperator, DefaultEventsMap } from 'socket.io';
import {
  gameObjectsPositionsSchema,
  GameObjectsPositionsType,
  PlayerType,
  playerTypeSchema,
} from '../game.schema.js';

export enum GameStatus {
  WAITING_FOR_PLAYERS, // 두 유저가 모두 접속하지 않은 경우
  STANDBY, // 게임이 시작되기 전 대기 상태
  COUNTDOWN, // 라운드 시작 전 카운트다운
  READY, // 카운트다운 후 준비 상태
  PLAYING, // 실제 탁구 게임 진행 중
  ROUND_OVER, // 한 라운드가 끝나고 점수 등을 표시하는 상태
  GAME_OVER, // 게임이 종료된 상태 (세션 정리 필요)
}

export default class GameSpace {
  private readonly COUNTDOWN_SECONDS: number = 3;

  private readonly world: CANNON.World = new CANNON.World({
    gravity: new CANNON.Vec3(0, -9.81, 0),
  });

  private status: GameStatus = GameStatus.WAITING_FOR_PLAYERS;
  private readonly originalGravity: CANNON.Vec3;

  constructor(
    private readonly ball: Ball,
    private readonly tablePlayer1: Table,
    private readonly tablePlayer2: Table,
    private readonly racket1: Racket,
    private readonly racket2: Racket,
    private readonly logger: BaseLogger,
    private readonly judgement: Judgement,
    private readonly socketRoom: BroadcastOperator<DefaultEventsMap, unknown>,
  ) {
    this.originalGravity = this.world.gravity.clone();
    this.world.broadphase = new CANNON.NaiveBroadphase();
    this.world.allowSleep = true;

    // 게임 시작 전에는 중력을 0으로 설정
    this.world.gravity.set(0, 0, 0);

    this.world.addBody(tablePlayer1.body);
    this.world.addBody(tablePlayer2.body);
    this.world.addBody(ball.body);
    this.world.addBody(racket1.body);
    this.world.addBody(racket2.body);

    const tablePlayer1Mat = this.tablePlayer1.getMaterial();
    const tablePlayer2Mat = this.tablePlayer2.getMaterial();
    const ballMat = this.ball.getMaterial();
    const racket1Mat = this.racket1.getMaterial();
    const racket2Mat = this.racket2.getMaterial();

    // 테이블 1과 공의 접촉 재질
    const tablePlayer1ContactMaterial = new CANNON.ContactMaterial(ballMat, tablePlayer1Mat, {
      restitution: 0.9, // 0 = 탄성 없음, 1 = 완전 탄성 충돌
      friction: 0.1,
    });

    // 테이블 2와 공의 접촉 재질
    const tablePlayer2ContactMaterial = new CANNON.ContactMaterial(ballMat, tablePlayer2Mat, {
      restitution: 0.9,
      friction: 0.1,
    });

    // 라켓과 공의 접촉 재질
    const racket1ContactMaterial = new CANNON.ContactMaterial(ballMat, racket1Mat, {
      restitution: 0.2,
      friction: 0.1,
    });
    const racket2ContactMaterial = new CANNON.ContactMaterial(ballMat, racket2Mat, {
      restitution: 0.2,
      friction: 0.1,
    });

    this.world.addContactMaterial(tablePlayer1ContactMaterial);
    this.world.addContactMaterial(tablePlayer2ContactMaterial);
    this.world.addContactMaterial(racket1ContactMaterial);
    this.world.addContactMaterial(racket2ContactMaterial);

    // 충돌 이벤트 리스너 설정
    this.world.addEventListener(
      'beginContact',
      (event: { bodyA: CANNON.Body; bodyB: CANNON.Body }) => this.collisionListeners(event),
    );

    this.reset(playerTypeSchema.enum.PLAYER1);
  }

  reset(player: PlayerType) {
    this.status = GameStatus.STANDBY;
    this.world.gravity.set(0, 0, 0);

    const racket1InitialPos = new CANNON.Vec3(2, 0.8, 0); // 예시 위치
    const racket2InitialPos = new CANNON.Vec3(-2, 0.8, 0); // 예시 위치

    this.racket1.body.position.copy(racket1InitialPos);
    this.racket1.body.velocity.set(0, 0, 0);
    this.racket1.body.angularVelocity.set(0, 0, 0);

    this.racket2.body.position.copy(racket2InitialPos);
    this.racket2.body.velocity.set(0, 0, 0);
    this.racket2.body.angularVelocity.set(0, 0, 0);

    this.ball.reset(player);
    this.ball.body.sleep();
    this.logger.info('게임 공간이 모든 객체와 함께 초기화되었습니다.');
  }

  step(dt: number): void {
    this.world.step(dt, dt, 10);

    if (this.ball.getY() <= 0) {
      this.status = GameStatus.ROUND_OVER;
      const judgeResult = this.judgement.judgeCollision({
        target: CollisionTarget.FLOOR,
        lastHitRacket: this.ball.getLastRacketPlayerId(),
        currentHitTable: this.ball.getCurrentHitTable(),
        previousHitTable: this.ball.getPreviousHitTable(),
      });
      this.logger.debug(judgeResult, '충돌 판정 결과 (바닥)');

      this.processRoundResult(judgeResult);
    }
  }

  startCountDown() {
    this.status = GameStatus.COUNTDOWN;
    let countdown = this.COUNTDOWN_SECONDS;

    const countdownIntervalId = setInterval(() => {
      this.logger.info(`게임 시작까지 ${countdown}초 남았습니다.`);

      this.socketRoom.emit(
        MATCH_SOCKET_EVENTS.COUNTDOWN,
        socketCountDownSchema.parse({ count: countdown }),
      );

      if (countdown <= 0) {
        this.status = GameStatus.READY;
        clearInterval(countdownIntervalId);
        return;
      }
      countdown -= 1;
    }, 1000);
  }

  getGameObjectsPositions(): GameObjectsPositionsType {
    return gameObjectsPositionsSchema.parse({
      ball: this.ball.body.position.clone(),
      racket1: this.racket1.getPosition(),
      racket2: this.racket2.body.position.clone(),
    });
  }

  updateRacketPosition(playerId: number, x: number, y: number, z: number) {
    if (!this.isGameReadyOrPlaying()) {
      // this.logger.warn(
      //   `Player ${playerId} tried to update racket position while game is not in READY or PLAYING state.`,
      // );
      return;
    }
    const racket = this.getRacketByPlayerId(playerId);
    let clampedX;
    if (playerId === this.racket1.getPlayerId()) {
      clampedX = this.clamp(x, 0, 2);
    } else {
      clampedX = this.clamp(x, -2, 0);
    }
    const clampedZ = this.clamp(z, -1.5, 1.5);
    racket.updatePositionTest(clampedX, y, clampedZ);
  }

  prepareForNextRound(nextServingPlayer: PlayerType) {
    this.reset(nextServingPlayer);
    this.startCountDown();
  }

  private processRoundResult(judgeResult: JudgementResult) {
    if (judgeResult.roundOver) {
      if (!judgeResult.nextServingPlayer)
        throw new Error('다음 서빙 플레이어가 지정되지 않았습니다.');

      const { player1Score, player2Score } = judgeResult.score;
      this.socketRoom.emit(MATCH_SOCKET_EVENTS.MATCH_SCORE, {
        player1Score,
        player2Score,
      });
      this.prepareForNextRound(judgeResult.nextServingPlayer);
      return;
    }

    if (judgeResult.gameOver) {
      this.logger.info(`게임 종료: 승자 - ${judgeResult.winner}`);
      this.status = GameStatus.GAME_OVER;
      // TODO: 게임 종료 관련 처리 로직 구현
      return;
    }
  }

  private collisionListeners(event: { bodyA: CANNON.Body; bodyB: CANNON.Body }) {
    const { bodyA, bodyB } = event;
    const ballBody = this.ball.body;

    const racketMap = new Map<CANNON.Body, Racket>([
      [this.racket1.body, this.racket1],
      [this.racket2.body, this.racket2],
    ]);
    const tableMap = new Map<CANNON.Body, Table>([
      [this.tablePlayer1.body, this.tablePlayer1],
      [this.tablePlayer2.body, this.tablePlayer2],
    ]);

    const otherBody = this.getOtherBody(ballBody, bodyA, bodyB);
    if (!otherBody) {
      return;
    }

    const racket = racketMap.get(otherBody);
    if (racket) {
      this.ball.recordRacketCollision(racket.getPlayerId());

      if (this.status === GameStatus.READY) {
        this.startGame();
      }
      return;
    }

    const table = tableMap.get(otherBody);
    if (table) {
      this.ball.recordTableCollision(table.getTableType());
      const judgeResult = this.judgement.judgeCollision({
        target: CollisionTarget.TABLE,
        lastHitRacket: this.ball.getLastRacketPlayerId(),
        currentHitTable: this.ball.getCurrentHitTable(),
        previousHitTable: this.ball.getPreviousHitTable(),
      });
      this.logger.debug(judgeResult, '충돌 판정 결과 (테이블)');
      this.processRoundResult(judgeResult);
      return;
    }
  }

  private startGame() {
    this.status = GameStatus.PLAYING;

    // 원래 중력 복원
    this.world.gravity.copy(this.originalGravity);
    this.logger.info('게임 시작: 중력 활성화됨');
  }

  private getOtherBody(ballBody: CANNON.Body, bodyA: CANNON.Body, bodyB: CANNON.Body) {
    if (bodyA === ballBody) {
      return bodyB;
    } else if (bodyB === ballBody) {
      return bodyA;
    }
    return null; // 볼과 관련 없는 충돌
  }

  private clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(value, max));
  }

  private getRacketByPlayerId(playerId: number): Racket {
    if (this.racket1.getPlayerId() === playerId) {
      return this.racket1;
    }
    if (this.racket2.getPlayerId() === playerId) {
      return this.racket2;
    }

    throw new Error(`Player with ID ${playerId} does not have a racket.`);
  }

  isGameReadyOrPlaying(): boolean {
    return this.status === GameStatus.READY || this.status === GameStatus.PLAYING;
  }

  isGamePlaying(): boolean {
    return this.status === GameStatus.PLAYING;
  }
}
