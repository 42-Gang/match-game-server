import * as CANNON from 'cannon-es';

export default class Ball {
  public body: CANNON.Body;

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
  }
}
