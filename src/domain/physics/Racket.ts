import * as CANNON from 'cannon-es';
import { PlayerType } from '../game.schema.js';
import { Logger } from 'pino';

export default class Racket {
  public body: CANNON.Body;

  constructor(private player: PlayerType) {
    const material = new CANNON.Material('racketMaterial');
    this.body = new CANNON.Body({
      type: CANNON.Body.KINEMATIC,
      shape: new CANNON.Box(new CANNON.Vec3(0.025, 0.15, 0.15)),
      material,
    });
    this.body.sleepState = CANNON.Body.AWAKE;
    this.body.position.set(1.8, 0.8, 0);

    const tiltAngle = 20 * Math.PI;
    const xAxis = new CANNON.Vec3(0, 0, -1);
    this.body.quaternion.setFromAxisAngle(xAxis, tiltAngle);
  }

  updatePositionTest(x: number, y: number, z: number) {
    const targetPos = new CANNON.Vec3(x, y, z);
    const delta = targetPos.vsub(this.body.position);
    const dt = 1 / 60;
    const speedScale = 0.3;
    const desiredVel = delta.scale(speedScale / dt);
    const maxSpeed = 5;
    const speed = desiredVel.length();
    if (speed > maxSpeed) {
      desiredVel.scale(maxSpeed / speed, desiredVel);
    }

    this.body.wakeUp();
    this.body.velocity.copy(desiredVel);

    // this.logger.info(`Racket position updated to: x=${x}, y=${y}, z=${z}`);
    console.log(`Racket position updated to: x=${x}, y=${y}, z=${z}`);
  }

  getPlayer(): PlayerType {
    return this.player;
  }

  getPosition() {
    return this.body.position.clone();
  }
}
