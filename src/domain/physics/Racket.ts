import * as CANNON from 'cannon-es';
import PhysicsEngine from './PhysicsEngine.js';
import { SwingType } from '../game.schema.js';

export default class Racket {
  public body: CANNON.Body;

  constructor(
    private engine: PhysicsEngine,
    initPos: CANNON.Vec3,
  ) {
    const material = new CANNON.Material('racketMaterial');
    this.body = new CANNON.Body({
      type: CANNON.Body.KINEMATIC,
      shape: new CANNON.Box(new CANNON.Vec3(0.1, 0.02, 0.15)),
      material,
      position: initPos,
    });
    engine.addBody(this.body);
  }

  updatePosition(x: number) {
    this.body.position.x = x;
  }

  swing(type: SwingType) {
    // TODO: swing 시 공과의 충돌 시 반발 속도 계산 로직 연결
  }
}
