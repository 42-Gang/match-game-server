import * as CANNON from 'cannon-es';
import { PlayerType, SwingType } from '../game.schema.js';

export default class Racket {
  public body: CANNON.Body;
  private static CANVAS_WIDTH = 800;
  private static CANVAS_HEIGHT = 600;
  private static HALF_WIDTH = 1.525 / 2; // m
  private static HALF_LENGTH = 2.74 / 2; // m

  constructor(
    private player: PlayerType,
    initPos: CANNON.Vec3,
  ) {
    const material = new CANNON.Material('racketMaterial');
    this.body = new CANNON.Body({
      type: CANNON.Body.KINEMATIC,
      shape: new CANNON.Box(new CANNON.Vec3(0.025, 0.15, 0.15)),
      material,
      mass: 0.1, // 가벼운 라켓
      position: initPos,
    });
    this.body.position.set(1.8, 0.8, 0);

    const tiltAngle = 45 * Math.PI;
    const xAxis = new CANNON.Vec3(0, 0, 1);
    this.body.quaternion.setFromAxisAngle(xAxis, tiltAngle);
  }

  updatePositionTest(x: number, y: number, z: number) {
    const targetPos = new CANNON.Vec3(x, y, z);

    // 2) 현 위치와 차분 계산
    const delta = targetPos.vsub(this.body.position);
    // 3) 프레임 시간(dt)에 맞춘 속도
    const dt = 1 / 60; // 예시

    // const desiredVel = delta.scale(1 / dt);
    const speedScale = 0.3; // 0~1 사이 값으로 속도 비율 조절
    const desiredVel = delta.scale(speedScale / dt);

    // 4) (선택) 최대 속도 제한
    const maxSpeed = 5;
    const speed = desiredVel.length();
    if (speed > maxSpeed) {
      desiredVel.scale(maxSpeed / speed, desiredVel);
    }

    // 5) 바디에 속도 세팅 & 위치 보간
    this.body.velocity.copy(desiredVel);

    // this.body.position.set(x, y, z);
    console.log(`Racket position updated to: x=${x}, y=${y}, z=${z}`);
  }

  updatePosition(screenX: number, screenY: number) {
    // screenY가 0~300 범위는 무시하고, 300~600을 0~1로 정규화
    const effectiveY = Math.max(0, screenY - 300); // 0~300
    const ny = effectiveY / 300; // 0 (위) ~ 1 (아래)
    const nx = screenX / Racket.CANVAS_WIDTH; // 0 (왼쪽) ~ 1 (오른쪽)

    // depthFactor: 화면 위(멀리)=1, 아래(가까이)=0으로 정의
    const depthFactor = ny; // 1(멀리), 0(가까이)

    // 전진(X축): 가까운 쪽(아래)이 0, 먼 쪽(위)이 MAX_FORWARD까지
    const MAX_FORWARD = 7;
    const worldX = depthFactor * MAX_FORWARD;

    // 좌우(Z축): 멀리 있을수록 이동 범위가 더 넓어짐
    const baseHalfZ = Racket.HALF_WIDTH;
    const zSensitivity = 1 + depthFactor; // 1~2배 증가로 범위 확대
    const worldZ = (nx - 0.5) * 2 * baseHalfZ * zSensitivity;

    // 디버깅 출력
    console.log(
      `screenX=${screenX.toFixed(0)}, screenY=${screenY.toFixed(0)} → worldX=${worldX.toFixed(2)}, worldZ=${worldZ.toFixed(2)}`,
    );

    // 물리 바디 위치 업데이트
    this.body.position.x = worldX;
    this.body.position.z = worldZ;
  }

  getPlayer(): PlayerType {
    return this.player;
  }

  getPosition() {
    return this.body.position.clone();
  }
}
