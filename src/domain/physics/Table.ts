import * as CANNON from 'cannon-es';
import PhysicsEngine from './PhysicsEngine.js';

export default class Table {
  constructor(
    private readonly engine: PhysicsEngine,
    private readonly x: number = 1.37, // 1370mm
    private readonly y: number = 0.015, // 15mm
    private readonly z: number = 2.74, // 2740mm
  ) {
    const material = new CANNON.Material('tableMaterial');
    const table = new CANNON.Body({
      type: CANNON.Body.STATIC,
      shape: new CANNON.Box(new CANNON.Vec3(x, y, z)), // 2740×1525mm
      material,
    });
    table.position.set(0, 0, 0);
    engine.addBody(table);
  }
}
