import * as CANNON from 'cannon-es';
import Ball from './Ball.js';
import Table, { TableType } from './Table.js';
import Racket from './Racket.js';
import { BaseLogger } from 'pino';
import Judgement, { CollisionTarget } from '../Judgement.js';

export default class GameSpace {
  private readonly world: CANNON.World = new CANNON.World({
    gravity: new CANNON.Vec3(0, -9.81, 0),
  });
  private gameTime: number = 0;
  private gameStarted: boolean = false;
  private originalGravity: CANNON.Vec3;

  constructor(
    private readonly ball: Ball,
    private readonly tablePlayer1: Table,
    private readonly tablePlayer2: Table,
    private readonly racket1: Racket,
    private readonly racket2: Racket,
    private readonly logger: BaseLogger,
    private readonly judgement: Judgement,
  ) {
    this.world.broadphase = new CANNON.NaiveBroadphase();
    this.world.allowSleep = true;
    this.originalGravity = this.world.gravity.clone();

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
  }

  reset() {
    this.gameTime = 0;
    this.gameStarted = false;

    this.logger.info('게임 공간 초기화: 중력 복원됨');
    this.world.gravity.set(0, 0, 0);
    this.ball.reset();
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

      if (!this.gameStarted) {
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
      this.logger.debug(judgeResult, '충돌 판정 결과');
      if (judgeResult.gameOver) {
        this.logger.info(`게임 종료: 승자 - ${judgeResult.winner}`);
      }
      return;
    }
  }

  private startGame() {
    this.gameStarted = true;

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

  step(dt: number) {
    this.gameTime += dt;
    this.world.step(dt, dt, 10);

    if (this.ball.getY() == 0) {
      const judgeResult = this.judgement.judgeCollision({
        target: CollisionTarget.FLOOR,
        lastHitRacket: this.ball.getLastRacketPlayerId(),
        currentHitTable: this.ball.getCurrentHitTable(),
        previousHitTable: this.ball.getPreviousHitTable(),
      });
      this.logger.debug(judgeResult, '충돌 판정 결과');
      if (judgeResult.gameOver) {
        this.logger.info(`게임 종료: 승자 - ${judgeResult.winner}`);
      }
    }
  }

  getBallPosition(): CANNON.Vec3 {
    return this.ball.body.position.clone();
  }

  getRacket1Position(): CANNON.Vec3 {
    return this.racket1.getPosition();
  }

  getRacket2Position(): CANNON.Vec3 {
    return this.racket2.body.position.clone();
  }

  private clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(value, max));
  }

  updateRacketPosition(playerId: number, x: number, y: number, z: number) {
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

  private getRacketByPlayerId(playerId: number): Racket {
    if (this.racket1.getPlayerId() === playerId) {
      return this.racket1;
    }
    if (this.racket2.getPlayerId() === playerId) {
      return this.racket2;
    }

    throw new Error(`Player with ID ${playerId} does not have a racket.`);
  }

  // 충돌 데이터 조회 메서드
  getBallLastRacketPlayerId(): number | null {
    return this.ball.getLastRacketPlayerId();
  }

  getBallLastTableType(): TableType | null {
    return this.ball.getCurrentHitTable();
  }

  getBallCollisionData() {
    return {
      lastRacketPlayerId: this.ball.getLastRacketPlayerId(),
      currentHitTable: this.ball.getCurrentHitTable(),
      previousHitTable: this.ball.getPreviousHitTable(),
    };
  }
}
