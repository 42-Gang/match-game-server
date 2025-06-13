import * as CANNON from 'cannon-es';
import Ball from './Ball.js';
import Table from './Table.js';
import Racket from './Racket.js';
import { PlayerType } from '../game.schema.js';

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

    const tableMat = table.body.material;
    const ballMat = ball.body.material;
    const racket1Mat = racket1.body.material;

    const contactMaterial = new CANNON.ContactMaterial(ballMat, tableMat, {
      restitution: 0.9, // 0 = 탄성 없음, 1 = 완전 탄성 충돌
      friction: 0.1,
    });
    const racketContactMaterial = new CANNON.ContactMaterial(ballMat, racket1Mat, {
      restitution: 0.2,
      friction: 0.1,
    });
    this.world.addContactMaterial(contactMaterial);
    this.world.addContactMaterial(racketContactMaterial);
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

  clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(value, max));
  }

  updateRacket1Position(player: PlayerType, x: number, y: number, z: number) {
    const racket = this.getRacketByPlayerId(player);
    const clampedX = this.clamp(x, 0, 2);
    const clampedZ = this.clamp(z, -1.5, 1.5);
    racket.updatePositionTest(clampedX, y, clampedZ);
  }

  private getRacketByPlayerId(player: PlayerType): Racket {
    if (this.racket1.getPlayer() === player) {
      return this.racket1;
    }
    if (this.racket2.getPlayer() === player) {
      return this.racket2;
    }

    throw new Error(`Player with ID ${player} does not have a racket.`);
  }
}
