import * as CANNON from 'cannon-es';
import { TableType } from './Table.js';

export default class Ball {
  public body: CANNON.Body;

  // 충돌 데이터 저장을 위한 변수들
  private lastRacketPlayerId: number | null = null;
  private lastTableType: TableType | null = null;
  private lastCollisionTime: number = 0;
  private lastRacketCollisionTime: number = 0;
  private lastTableCollisionTime: number = 0;

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
    this.body.position.set(1, 1.5, 0); // x=0, y=0.8m, z=0 (탁구대 중앙 상공)
    this.body.velocity.set(0, 0, 0);
    this.body.angularVelocity.set(0, 0, 0);

    // 충돌 데이터 초기화
    this.lastRacketPlayerId = null;
    this.lastTableType = null;
    this.lastCollisionTime = 0;
    this.lastRacketCollisionTime = 0;
    this.lastTableCollisionTime = 0;
  }

  getMaterial() {
    if (!this.body.material) {
      throw new Error('Ball material is not defined');
    }
    return this.body.material;
  }

  // 충돌 데이터 기록 메서드
  recordRacketCollision(playerId: number, currentTime: number) {
    this.lastRacketPlayerId = playerId;
    this.lastRacketCollisionTime = currentTime;
    this.lastCollisionTime = currentTime;
  }

  recordTableCollision(tableType: TableType, currentTime: number) {
    this.lastTableType = tableType;
    this.lastTableCollisionTime = currentTime;
    this.lastCollisionTime = currentTime;
  }

  // 충돌 데이터 조회 메서드
  getLastRacketPlayerId(): number | null {
    return this.lastRacketPlayerId;
  }

  getLastTableType(): TableType | null {
    return this.lastTableType;
  }

  getLastCollisionTime(): number {
    return this.lastCollisionTime;
  }

  getLastRacketCollisionTime(): number {
    return this.lastRacketCollisionTime;
  }

  getLastTableCollisionTime(): number {
    return this.lastTableCollisionTime;
  }

  hasCollidedWithRacketRecently(timeThreshold: number, currentTime: number): boolean {
    return (
      this.lastRacketCollisionTime > 0 && currentTime - this.lastRacketCollisionTime < timeThreshold
    );
  }

  hasCollidedWithTableRecently(timeThreshold: number, currentTime: number): boolean {
    return (
      this.lastTableCollisionTime > 0 && currentTime - this.lastTableCollisionTime < timeThreshold
    );
  }
}
