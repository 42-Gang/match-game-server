import * as CANNON from 'cannon-es';

export default class Table {
  public body: CANNON.Body;

  constructor(
    halfWidth = 1.525 / 2, // 0.7625m
    halfThickness = 1, // 상판 두께
    halfLength = 2.74 / 2, // 1.37m
  ) {
    const material = new CANNON.Material('tableMaterial');
    this.body = new CANNON.Body({
      type: CANNON.Body.STATIC,
      shape: new CANNON.Box(new CANNON.Vec3(halfWidth, halfThickness, halfLength)),
      material,
    });
    this.body.position.set(0, 0.76 - halfThickness, 0); // 상판 중심이 높이 0.76m에 오도록
  }
}
