import * as CANNON from 'cannon-es';
import Ball from './Ball.js';
import Table from './Table.js';
import Racket from './Racket.js';
import { SwingType } from '../game.schema.js';

export default class PhysicsEngine {
  constructor(
    private world: CANNON.World = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.81, 0) }),
    private readonly ball: Ball,
    private readonly table: Table,
    private readonly racket1: Racket,
    private readonly racket2: Racket,
  ) {
    world.broadphase = new CANNON.NaiveBroadphase();
    world.allowSleep = true;
  }

  addBody(body: CANNON.Body) {
    this.world.addBody(body);
  }

  step(dt: number) {
    this.world.step(dt);
  }

  getBallPosition(): CANNON.Vec3 {
    return this.ball.body.position.clone();
  }

  getRacket1Position(): CANNON.Vec3 {
    return this.racket1.body.position.clone();
  }

  getRacket2Position(): CANNON.Vec3 {
    return this.racket2.body.position.clone();
  }

  updateRocketPosition(playerId: number, x: number) {
    const racket = this.getRacketByPlayerId(playerId);
    racket.updatePosition(x);
  }

  swingRacket(playerId: number, swingType: SwingType) {
    const racket = this.getRacketByPlayerId(playerId);
    racket.swing(swingType);
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
