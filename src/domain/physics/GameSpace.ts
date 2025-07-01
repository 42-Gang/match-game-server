import * as CANNON from 'cannon-es';
import Ball from './Ball.js';
import Table from './Table.js';
import Racket from './Racket.js';
import { BaseLogger } from 'pino';
import {
  gameObjectsPositionsSchema,
  GameObjectsPositionsType,
  PlayerType,
  playerTypeSchema,
} from '../game.schema.js';

export enum CollisionEventType {
  BALL_RACKET,
  BALL_TABLE,
  BALL_FLOOR,
}

export interface CollisionEvent {
  type: CollisionEventType;
  ball: Ball;
  racket?: Racket;
  table?: Table;
}

export default class GameSpace {
  private readonly world: CANNON.World;
  private onCollision?: { (event: CollisionEvent): void };
  private readonly originalGravity: CANNON.Vec3;

  private readonly floorBody: CANNON.Body;
  private readonly floorMaterial: CANNON.Material = new CANNON.Material('floor');

  constructor(
    private readonly ball: Ball,
    private readonly tablePlayer1: Table,
    private readonly tablePlayer2: Table,
    private readonly racket1: Racket,
    private readonly racket2: Racket,
    private readonly logger: BaseLogger,
    private readonly gravityY: number,
  ) {
    this.world = new CANNON.World({
      gravity: new CANNON.Vec3(0, this.gravityY, 0),
    });

    this.originalGravity = this.world.gravity.clone();
    this.world.broadphase = new CANNON.NaiveBroadphase();
    this.world.allowSleep = true;
    this.world.gravity.set(0, 0, 0);

    this.floorBody = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Plane(),
      material: this.floorMaterial,
    });
    // 바닥 Plane의 기본 방향은 z축이므로, x축을 기준으로 -90도 회전하여 수평면(xz 평면)으로 만듭니다.
    this.floorBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);

    // Body들 추가
    this.world.addBody(tablePlayer1.body);
    this.world.addBody(tablePlayer2.body);
    this.world.addBody(ball.body);
    this.world.addBody(racket1.body);
    this.world.addBody(racket2.body);
    this.world.addBody(this.floorBody);

    // ContactMaterial 설정
    this.setupContactMaterials();

    // 충돌 이벤트 리스너 설정
    this.world.addEventListener(
      'beginContact',
      (event: { bodyA: CANNON.Body; bodyB: CANNON.Body }) => this.handleCollision(event),
    );

    this.reset(playerTypeSchema.enum.PLAYER1);
  }

  public onCollisionEvent(callback: (event: CollisionEvent) => void) {
    this.onCollision = callback;
  }

  private setupContactMaterials() {
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
    const ballFloorContactMaterial = new CANNON.ContactMaterial(ballMat, this.floorMaterial, {
      restitution: 0.4,
      friction: 0.5,
    });

    this.world.addContactMaterial(tablePlayer1ContactMaterial);
    this.world.addContactMaterial(tablePlayer2ContactMaterial);
    this.world.addContactMaterial(racket1ContactMaterial);
    this.world.addContactMaterial(racket2ContactMaterial);
    this.world.addContactMaterial(ballFloorContactMaterial);
  }

  reset(player: PlayerType) {
    // this.status = GameStatus.STANDBY;
    this.world.gravity.set(0, 0, 0);

    const racket1InitialPos = new CANNON.Vec3(2, 0.8, 0);
    const racket2InitialPos = new CANNON.Vec3(-2, 0.8, 0);

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

  public activateGravity() {
    this.world.gravity.copy(this.originalGravity);
    this.logger.info('중력이 활성화되었습니다.');
  }

  step(dt: number): void {
    this.world.step(dt, dt, 10);

    this.clampBallVelocity();
  }

  private clampBallVelocity() {
    const velocity = this.ball.body.velocity;
    const speed = velocity.length();

    if (speed > 3) {
      this.ball.body.velocity.scale(0.95, this.ball.body.velocity);
      this.ball.body.angularVelocity.scale(0.95, this.ball.body.angularVelocity);
      this.logger.debug(
        `공의 속도가 제한되었습니다: ${speed.toFixed(2)} -> ${this.ball.body.velocity.length().toFixed(2)}`,
      );
    }
  }

  getGameObjectsPositions(): GameObjectsPositionsType {
    return gameObjectsPositionsSchema.parse({
      ball: this.ball.body.position.clone(),
      racket1: this.racket1.getPosition(),
      racket2: this.racket2.body.position.clone(),
    });
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

  private getOtherBody(ballBody: CANNON.Body, bodyA: CANNON.Body, bodyB: CANNON.Body) {
    if (bodyA === ballBody) {
      return bodyB;
    }
    if (bodyB === ballBody) {
      return bodyA;
    }
    return null;
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

  private handleCollision(event: { bodyA: CANNON.Body; bodyB: CANNON.Body }) {
    if (!this.onCollision) {
      this.logger.error(`Collision event handler is not set.`);
      throw new Error(`Collision event handler is not set.`);
    }

    const { bodyA, bodyB } = event;
    const ballBody = this.ball.body;
    const otherBody = this.getOtherBody(ballBody, bodyA, bodyB);
    if (!otherBody) {
      this.logger.error(`Collision detected but other body is not recognized.`);
      return;
    }

    if (otherBody === this.racket1.body || otherBody === this.racket2.body) {
      this.onCollision({
        type: CollisionEventType.BALL_RACKET,
        ball: this.ball,
        racket: otherBody === this.racket1.body ? this.racket1 : this.racket2,
      });
      return;
    }

    if (otherBody === this.tablePlayer1.body || otherBody === this.tablePlayer2.body) {
      this.onCollision({
        type: CollisionEventType.BALL_TABLE,
        ball: this.ball,
        table: otherBody === this.tablePlayer1.body ? this.tablePlayer1 : this.tablePlayer2,
      });
      return;
    }

    if (otherBody === this.floorBody) {
      this.onCollision({
        type: CollisionEventType.BALL_FLOOR,
        ball: this.ball,
      });
      return;
    }
  }
}
