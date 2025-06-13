import * as CANNON from 'cannon-es';
import Ball from './Ball.js';
import Table from './Table.js';
import Racket from './Racket.js';

export default class GameSpace {
  private readonly world: CANNON.World = new CANNON.World({
    gravity: new CANNON.Vec3(0, -9.81, 0),
  });

  constructor(
    private readonly ball: Ball,
    private readonly table: Table,
    private readonly racket1: Racket,
    private readonly racket2: Racket,
  ) {
    this.world.broadphase = new CANNON.NaiveBroadphase();
    this.world.allowSleep = true;

    this.world.addBody(table.body);
    this.world.addBody(ball.body);
    this.world.addBody(racket1.body);
    this.world.addBody(racket2.body);

    const tableMat = this.table.getMaterial();
    const ballMat = this.ball.getMaterial();
    const racket1Mat = this.racket1.getMaterial();
    const racket2Mat = this.racket2.getMaterial();

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
}
