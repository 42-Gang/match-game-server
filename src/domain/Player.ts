export interface PlayerInput {
  x: number; // 라켓의 x 위치
  swing?: 'LEFT' | 'RIGHT'; // 클릭 타입
}

export default class Player {
  constructor(public id: string) {}
}
