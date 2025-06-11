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
      shape: new CANNON.Box(new CANNON.Vec3(0.1, 1, 0.15)),
      material,
      position: initPos,
    });
  }

  updatePosition(screenX: number, screenY: number) {
    const nx = screenX / Racket.CANVAS_WIDTH; // 0 ~ 1
    const ny = screenY / Racket.CANVAS_HEIGHT; // 0 ~ 1

    const worldX = ny * 2.3;
    let worldZ = (nx - 0.5) * 2 * Racket.HALF_WIDTH;
    console.log(`worldZ: ${worldZ}, delta: ${(ny - 1) * (nx - 0.5)}`);
    if (nx - 0.5 < 0) {
      worldZ -= (ny - 1) * (nx - 0.5);
      console.log('Adjusting worldZ for negative nx');
    } else {
      console.log('Adjusting worldZ for positive nx');
      worldZ -= (ny - 1) * (nx - 0.5);
    }

    console.log(
      `Screen position: (${screenX}, ${screenY}) -> World position: (${worldX}, ${this.body.position.y}, ${worldZ})`,
    );

    this.body.position.x = worldX;
    this.body.position.z = worldZ;
  }

  swing(type: SwingType) {
    // TODO: swing 시 공과의 충돌 시 반발 속도 계산 로직 연결
  }

  getPlayer(): PlayerType {
    return this.player;
  }

  getPosition() {
    return this.body.position.clone();
  }
}
