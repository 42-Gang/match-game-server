import * as CANNON from 'cannon-es';

export default class Table {
  public body: CANNON.Body;

  constructor(
    halfWidth = 1.5 / 2, // 0.7625m
    halfThickness = 0.5, // 상판 두께
    halfLength = 3 / 2, // 1.37m
  ) {
    const material = new CANNON.Material('tableMaterial');
    this.body = new CANNON.Body({
      type: CANNON.Body.STATIC,
      shape: new CANNON.Box(new CANNON.Vec3(halfLength, halfThickness, halfWidth)),
      material,
    });
    this.body.position.set(0, 0.76 - halfThickness, 0); // 상판 중심이 높이 0.76m에 오도록
  }

  getMaterial(): CANNON.Material {
    if (!this.body.material) {
      throw new Error('Table body material is not defined');
    }
    return this.body.material;
  }
}
