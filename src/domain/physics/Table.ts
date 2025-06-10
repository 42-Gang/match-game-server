import * as CANNON from 'cannon-es';

export default class Table {
  public body: CANNON.Body;
  static LENGTH: number = 2.74;

  constructor(
    x: number = 1.37, // 1370mm
    y: number = 0.015, // 15mm
    z: number = 2.74, // 2740mm
  ) {
    const material = new CANNON.Material('tableMaterial');
    this.body = new CANNON.Body({
      type: CANNON.Body.STATIC,
      shape: new CANNON.Box(new CANNON.Vec3(x, y, z)), // 2740×1525mm
      material,
    });
    this.body.position.set(0, 0, 0);
  }
}
