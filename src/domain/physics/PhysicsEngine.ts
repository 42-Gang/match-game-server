import * as CANNON from 'cannon-es';

export default class PhysicsEngine {
  private readonly world: CANNON.World;

  constructor() {
    this.world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.81, 0) });
    this.world.broadphase = new CANNON.NaiveBroadphase();
    this.world.allowSleep = true;
  }

  addBody(body: CANNON.Body) {
    this.world.addBody(body);
  }

  step(dt: number) {
    this.world.step(dt);
  }
}
