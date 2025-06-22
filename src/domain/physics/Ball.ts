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
    // y 값을 0.8에서 1.0으로 조정하여 채와 비슷한 높이에 위치시킴
    this.body.position.set(1, 1.0, 0); // 채와 같은 높이로 조정
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
}
