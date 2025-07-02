import * as CANNON from 'cannon-es';
import { PlayerType, playerTypeSchema } from '../game.schema.js';

export default class Racket {
  public body: CANNON.Body;

  constructor(
    private readonly playerId: number,
    private readonly playerType: PlayerType,
  ) {
    const material = new CANNON.Material('racketMaterial');
    this.body = new CANNON.Body({
      type: CANNON.Body.KINEMATIC,
      shape: new CANNON.Box(new CANNON.Vec3(0.05, 0.15, 0.15)),
      material,
    });
    this.body.sleepState = CANNON.Body.AWAKE;

    // playerType에 따라 기울이기
    const baseTilt = (Math.PI / 180) * 40; // 40도
    const tiltAngle = this.playerType === playerTypeSchema.enum.PLAYER1 ? -baseTilt : baseTilt;
    const xAxis = new CANNON.Vec3(0, 0, -1);
    this.body.quaternion.setFromAxisAngle(xAxis, tiltAngle);
  }

  updatePositionTest(x: number, y: number, z: number) {
    const targetPos = new CANNON.Vec3(x, y, z);
    const delta = targetPos.vsub(this.body.position);
    const dt = 1 / 60;
    const speedScale = 0.3;
    const desiredVel = delta.scale(speedScale / dt);
    const maxSpeed = 6;
    const speed = desiredVel.length();
    if (speed > maxSpeed) {
      desiredVel.scale(maxSpeed / speed, desiredVel);
    }

    this.body.wakeUp();
    this.body.velocity.copy(desiredVel);
  }

  getPlayerId() {
    return this.playerId;
  }

  getPosition() {
    return this.body.position.clone();
  }

  getMaterial() {
    if (!this.body.material) {
      throw new Error('Racket material is not defined');
    }
    return this.body.material;
  }
}
