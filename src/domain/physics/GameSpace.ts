import * as CANNON from 'cannon-es';
import Ball from './Ball.js';
import Table from './Table.js';
import Racket from './Racket.js';
import { PlayerType, playerTypeSchema } from '../game.schema.js';

export default class GameSpace {
  private readonly world: CANNON.World = new CANNON.World({
    gravity: new CANNON.Vec3(0, -9.81, 0),
  });

  constructor(
    private readonly ball: Ball,
    private readonly table: Table,
    private readonly racket1: Racket,
    private readonly racket2: Racket,
    private player1Id?: number,
    private player2Id?: number,
  ) {
    this.world.broadphase = new CANNON.NaiveBroadphase();
    this.world.allowSleep = true;

    this.world.addBody(table.body);
    this.world.addBody(ball.body);
    this.world.addBody(racket1.body);
    this.world.addBody(racket2.body);

    const tableMat = table.body.material;
    const ballMat = ball.body.material;
    const racket1Mat = racket1.body.material;
    const racket2Mat = racket2.body.material;

    const contactMaterial = new CANNON.ContactMaterial(ballMat, tableMat, {
      restitution: 0.9, // 0 = 탄성 없음, 1 = 완전 탄성 충돌
      friction: 0.1,
    });
    const racketContactMaterial = new CANNON.ContactMaterial(ballMat, racket1Mat, {
      restitution: 0.2,
      friction: 0.1,
    });
    const racket2ContactMaterial = new CANNON.ContactMaterial(ballMat, racket2Mat, {
      restitution: 0.2,
      friction: 0.1,
    });
    this.world.addContactMaterial(contactMaterial);
    this.world.addContactMaterial(racketContactMaterial);
    this.world.addContactMaterial(racket2ContactMaterial);
  }

  addBody(body: CANNON.Body) {
    this.world.addBody(body);
  }

  step(dt: number) {
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
    if (playerId === this.player1Id) {
      clampedX = this.clamp(x, 0, 2);
    } else {
      clampedX = this.clamp(x, -2, 0);
    }
    const clampedZ = this.clamp(z, -1.5, 1.5);
    racket.updatePositionTest(clampedX, y, clampedZ);
  }

  setPlayer2Id(playerId: number) {
    if (this.player2Id !== undefined) {
      throw new Error('Player 2 ID is already set.');
    }
    this.player2Id = playerId;
    this.world.addBody(this.racket2.body);
  }

  private getRacketByPlayerId(playerId: number): Racket {
    if (this.player1Id === playerId) {
      return this.racket1;
    }
    if (this.player2Id === playerId) {
      return this.racket2;
    }

    throw new Error(`Player with ID ${playerId} does not have a racket.`);
  }
}
