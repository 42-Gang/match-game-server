import * as CANNON from 'cannon-es';
import { TableType } from './Table.js';

export default class Ball {
  public body: CANNON.Body;

  private lastRacketPlayerId: number | null = null;
  private currentHitTable: TableType | null = null;
  private previousHitTable: TableType | null = null;

  constructor() {
    const material = new CANNON.Material('ballMaterial');
    this.body = new CANNON.Body({
      mass: 0.0027,
      shape: new CANNON.Sphere(0.1), // 10cm 지름
      material,
    });
    this.reset();
  }

  reset() {
    // 공의 시작 위치를 라켓 위치로 설정
    this.body.velocity.set(0, 0, 0);
    this.body.angularVelocity.set(0, 0, 0);
    this.body.position.set(1, 1.0, 0);

    // 충돌 데이터 초기화
    this.lastRacketPlayerId = null;
    this.previousHitTable = null;
    this.currentHitTable = null;
  }

  getMaterial() {
    if (!this.body.material) {
      throw new Error('Ball material is not defined');
    }
    return this.body.material;
  }

  recordRacketCollision(playerId: number) {
    this.lastRacketPlayerId = playerId;
    this.previousHitTable = null;
    this.currentHitTable = null;
  }

  recordTableCollision(tableType: TableType) {
    this.previousHitTable = this.currentHitTable;
    this.currentHitTable = tableType;
  }

  getLastRacketPlayerId(): number | null {
    return this.lastRacketPlayerId;
  }

  getCurrentHitTable(): TableType | null {
    return this.currentHitTable;
  }

  getPreviousHitTable(): TableType | null {
    return this.previousHitTable;
  }

  getY() {
    if (!this.body.position) {
      throw new Error('Ball position is not defined');
    }
    return this.body.position.y;
  }
}
