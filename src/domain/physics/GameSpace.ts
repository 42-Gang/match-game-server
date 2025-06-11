import * as CANNON from 'cannon-es';
import Ball from './Ball.js';
import Table from './Table.js';
import Racket from './Racket.js';
import { PlayerType, SwingType } from '../game.schema.js';

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
    // private world: CANNON.World = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.81, 0) }),
    this.world.broadphase = new CANNON.NaiveBroadphase();
    this.world.allowSleep = true;

    this.world.addBody(table.body);
    this.world.addBody(ball.body);

    const tableMat = table.body.material;
    const ballMat = ball.body.material;

    this.world.gravity.set(0, -9.81, 0); // ← 이 한 줄 추가!

    const contactMaterial = new CANNON.ContactMaterial(ballMat, tableMat, {
      restitution: 0.9, // 0 = 탄성 없음, 1 = 완전 탄성 충돌
      friction: 0.1,
    });
    this.world.addContactMaterial(contactMaterial);
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
    return this.racket1.getPosition();
  }

  getRacket2Position(): CANNON.Vec3 {
    return this.racket2.body.position.clone();
  }

  updateRocketPosition(player: PlayerType, x: number, y: number) {
    const racket = this.getRacketByPlayerId(player);
    racket.updatePosition(x, y);
  }

  swingRacket(player: PlayerType, swingType: SwingType) {
    const racket = this.getRacketByPlayerId(player);
    racket.swing(swingType);
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
