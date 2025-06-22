import * as CANNON from 'cannon-es';

export enum TableType {
  PLAYER1 = 'PLAYER1',
  PLAYER2 = 'PLAYER2',
}

export default class Table {
  public body: CANNON.Body;
  public tableType: TableType;

  constructor(
    tableType: TableType,
    halfWidth = 1.5 / 2, // 0.7625m
    halfThickness = 0.5, // 상판 두께
    halfLength = 1.5 / 2, // 테이블 길이 반으로 분할
  ) {
    this.tableType = tableType;
    const material = new CANNON.Material(`table${tableType}Material`);
    this.body = new CANNON.Body({
      type: CANNON.Body.STATIC,
      shape: new CANNON.Box(new CANNON.Vec3(halfLength, halfThickness, halfWidth)),
      material,
    });

    // 테이블 위치 설정: player1 테이블은 양수 x 영역, player2 테이블은 음수 x 영역
    const xPosition = tableType === TableType.PLAYER1 ? halfLength : -halfLength;
    this.body.position.set(xPosition, 0.76 - halfThickness, 0); // 상판 중심이 높이 0.76m에 오도록
  }

  getMaterial(): CANNON.Material {
    if (!this.body.material) {
      throw new Error('Table body material is not defined');
    }
    return this.body.material;
  }

  getTableType(): TableType {
    return this.tableType;
  }
}
