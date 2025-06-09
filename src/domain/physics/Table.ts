import * as CANNON from 'cannon-es';
import PhysicsEngine from './PhysicsEngine.js';

export default class Table {
  constructor(engine: PhysicsEngine) {
    const material = new CANNON.Material('tableMaterial');
    const table = new CANNON.Body({
      type: CANNON.Body.STATIC,
      shape: new CANNON.Box(new CANNON.Vec3(1.37, 0.015, 2.74)), // 2740×1525mm
      material,
    });
    table.position.set(0, 0, 0);
    engine.addBody(table);
  }
}
