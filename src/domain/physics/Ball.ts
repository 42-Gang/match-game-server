import * as CANNON from 'cannon-es';
import { PlayerType } from '../game.schema.js';

export default class Ball {
  public body: CANNON.Body;
  private lastHitPlayer: PlayerType | null = null;
  private touchedTable: boolean = false;

  constructor() {
    const material = new CANNON.Material('ballMaterial');
    this.body = new CANNON.Body({
      mass: 0.0027,
      shape: new CANNON.Sphere(0.2), // 반지름 20mm
      material,
    });
    this.reset();
  }

  reset() {
    this.body.position.set(0.7, 1.5, 0); // x=0, y=0.8m, z=0 (탁구대 중앙 상공)
    this.body.velocity.set(0, 0, 0);
    this.body.angularVelocity.set(0, 0, 0);

    this.lastHitPlayer = null;
    this.touchedTable = false;
  }

  setLastHitPlayer(player: PlayerType): void {
    this.lastHitPlayer = player;
  }

  getLastHitPlayer(): PlayerType | null {
    return this.lastHitPlayer;
  }

  markTableTouched(): void {
    this.touchedTable = true;
  }

  hasTouchedTable(): boolean {
    return this.touchedTable;
  }

  getPosition(): CANNON.Vec3 {
    return this.body.position.clone();
  }
}
