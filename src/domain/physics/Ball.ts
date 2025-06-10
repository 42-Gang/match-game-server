import * as CANNON from 'cannon-es';
import { PlayerType } from '../game.schema.js';

export default class Ball {
  public body: CANNON.Body;
  private lastHitPlayer: PlayerType | null = null;
  private touchedTable: boolean = false;

  constructor() {
    const material = new CANNON.Material('ballMaterial');
    this.body = new CANNON.Body({
      mass: 0.0027, // 약 2.7g
      shape: new CANNON.Sphere(0.02), // 반지름 20mm
      material,
    });
    this.reset();
  }

  reset() {
    this.body.position.set(0, 0.2, 0);
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
}
