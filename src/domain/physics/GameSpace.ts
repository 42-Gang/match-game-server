import * as CANNON from 'cannon-es';
import Ball from './Ball.js';
import Table, { TableType } from './Table.js';
import Racket from './Racket.js';

export default class GameSpace {
  private readonly world: CANNON.World = new CANNON.World({
    gravity: new CANNON.Vec3(0, -9.81, 0),
  });
  private gameTime: number = 0;

  constructor(
    private readonly ball: Ball,
    private readonly tablePlayer1: Table,
    private readonly tablePlayer2: Table,
    private readonly racket1: Racket,
    private readonly racket2: Racket,
  ) {
    this.world.broadphase = new CANNON.NaiveBroadphase();
    this.world.allowSleep = true;

    // 두 개의 테이블을 세계에 추가
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
    this.setupCollisionListeners();
  }

  private setupCollisionListeners() {
    // 충돌 시작 이벤트
    this.world.addEventListener('beginContact', (event) => {
      const { bodyA, bodyB } = event;

      // Ball과 Racket 충돌 감지
      if (
        bodyA === this.ball.body &&
        (bodyB === this.racket1.body || bodyB === this.racket2.body)
      ) {
        const racket = bodyB === this.racket1.body ? this.racket1 : this.racket2;
        this.ball.recordRacketCollision(racket.getPlayerId(), this.gameTime);
      } else if (
        bodyB === this.ball.body &&
        (bodyA === this.racket1.body || bodyA === this.racket2.body)
      ) {
        const racket = bodyA === this.racket1.body ? this.racket1 : this.racket2;
        this.ball.recordRacketCollision(racket.getPlayerId(), this.gameTime);
      }

      // Ball과 Table 충돌 감지
      if (
        bodyA === this.ball.body &&
        (bodyB === this.tablePlayer1.body || bodyB === this.tablePlayer2.body)
      ) {
        const table = bodyB === this.tablePlayer1.body ? this.tablePlayer1 : this.tablePlayer2;
        this.ball.recordTableCollision(table.getTableType(), this.gameTime);
      } else if (
        bodyB === this.ball.body &&
        (bodyA === this.tablePlayer1.body || bodyA === this.tablePlayer2.body)
      ) {
        const table = bodyA === this.tablePlayer1.body ? this.tablePlayer1 : this.tablePlayer2;
        this.ball.recordTableCollision(table.getTableType(), this.gameTime);
      }
    });
  }

  step(dt: number) {
    this.gameTime += dt;
    this.world.step(dt, dt, 10);
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
    return this.ball.getLastTableType();
  }

  getBallCollisionData() {
    return {
      lastRacketPlayerId: this.ball.getLastRacketPlayerId(),
      lastTableType: this.ball.getLastTableType(),
      lastCollisionTime: this.ball.getLastCollisionTime(),
      lastRacketCollisionTime: this.ball.getLastRacketCollisionTime(),
      lastTableCollisionTime: this.ball.getLastTableCollisionTime(),
    };
  }

  hasCollidedWithTableRecently(timeThreshold: number = 0.1): boolean {
    return this.ball.hasCollidedWithTableRecently(timeThreshold, this.gameTime);
  }

  hasCollidedWithRacketRecently(timeThreshold: number = 0.1): boolean {
    return this.ball.hasCollidedWithRacketRecently(timeThreshold, this.gameTime);
  }
}
