import * as CANNON from 'cannon-es';
import { PlayerType } from '../game.schema.js';

export default class Racket {
  public body: CANNON.Body;

  constructor(private player: PlayerType) {
    const material = new CANNON.Material('racketMaterial');
    this.body = new CANNON.Body({
      type: CANNON.Body.KINEMATIC,
      shape: new CANNON.Box(new CANNON.Vec3(0.025, 0.15, 0.15)),
      material,
      mass: 0.1, // 가벼운 라켓
    });
    this.body.position.set(1.8, 0.8, 0);

    const tiltAngle = 20 * Math.PI;
    const xAxis = new CANNON.Vec3(0, 0, 1);
    this.body.quaternion.setFromAxisAngle(xAxis, tiltAngle);
  }

  updatePositionTest(x: number, y: number, z: number) {
    const targetPos = new CANNON.Vec3(x, y, z);

    // 현 위치와 차분 계산
    const delta = targetPos.vsub(this.body.position);
    // 프레임 시간(dt)에 맞춘 속도
    const dt = 1 / 60;

    const speedScale = 0.3; // 0~1 사이 값으로 속도 비율 조절
    const desiredVel = delta.scale(speedScale / dt);

    // 최대 속도 제한
    const maxSpeed = 5;
    const speed = desiredVel.length();
    if (speed > maxSpeed) {
      desiredVel.scale(maxSpeed / speed, desiredVel);
    }

    // 바디에 속도 세팅 & 위치 보간
    this.body.velocity.copy(desiredVel);
    console.log(`Racket position updated to: x=${x}, y=${y}, z=${z}`);
  }

  getPlayer(): PlayerType {
    return this.player;
  }

  getPosition() {
    return this.body.position.clone();
  }
}
