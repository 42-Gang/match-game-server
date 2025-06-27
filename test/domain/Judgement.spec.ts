import { TableType } from '../../src/domain/physics/Table.js';
import { PlayerType, playerTypeSchema } from '../../src/domain/game.schema.js';
import Judgement, { CollisionData, CollisionTarget } from '../../src/domain/Judgement.js';
import { Logger } from 'pino';
import { beforeEach, describe, expect, it, vitest } from 'vitest';

const makeLogger = () => {
  return {
    info: vitest.fn(),
    warn: vitest.fn(),
    error: vitest.fn(),
  } as unknown as Logger;
};

let judgement: Judgement;
let logger: Logger;
const PLAYER1_ID = 1;
const PLAYER2_ID = 2;

beforeEach(() => {
  logger = makeLogger();
  judgement = new Judgement(PLAYER1_ID, PLAYER2_ID, logger);
});

it('초기 상태: 점수 0-0, 서브 플레이어 PLAYER1', () => {
  const noCollision: CollisionData = {
    currentHitTable: null,
    previousHitTable: null,
    lastHitRacket: null,
    target: CollisionTarget.TABLE,
  };
  const result = judgement.judgeCollision(noCollision);
  expect(result.score.player1Score).toBe(0);
  expect(result.score.player2Score).toBe(0);
  expect(result.nextServingPlayer).toBe(playerTypeSchema.enum.PLAYER1);
  expect(result.gameOver).toBe(false);
  expect(result.winner).toBeNull();
});

describe('서브 게임 관련', () => {
  it('P1 승 (상대 테이블 두번 터치)', () => {
    const collision: CollisionData = {
      currentHitTable: TableType.PLAYER2,
      previousHitTable: TableType.PLAYER2,
      lastHitRacket: PLAYER1_ID,
      target: CollisionTarget.TABLE,
    };

    const result = judgement.judgeCollision(collision);
    expect(result.score.player1Score).toBe(0);
    expect(result.score.player2Score).toBe(0);
    expect(result.nextServingPlayer).toBe(playerTypeSchema.enum.PLAYER1);
    expect(result.gameOver).toBe(false);
  });

  it('P2 승 (상대 테이블 두번 터치)', () => {
    const collision: CollisionData = {
      currentHitTable: TableType.PLAYER1,
      previousHitTable: TableType.PLAYER1,
      lastHitRacket: PLAYER2_ID,
      target: CollisionTarget.TABLE,
    };

    const result = judgement.judgeCollision(collision);
    expect(result.score.player1Score).toBe(0);
    expect(result.score.player2Score).toBe(0);
    expect(result.nextServingPlayer).toBe(playerTypeSchema.enum.PLAYER2);
    expect(result.gameOver).toBe(false);
  });

  it('P1 승 (바닥 터치)', () => {
    const collision: CollisionData = {
      currentHitTable: TableType.PLAYER2,
      previousHitTable: null,
      lastHitRacket: PLAYER1_ID,
      target: CollisionTarget.FLOOR,
    };

    const result = judgement.judgeCollision(collision);
    expect(result.score.player1Score).toBe(0);
    expect(result.score.player2Score).toBe(0);
    expect(result.nextServingPlayer).toBe(playerTypeSchema.enum.PLAYER1);
    expect(result.gameOver).toBe(false);
  });

  it('P2 승 (바닥 터치)', () => {
    const collision: CollisionData = {
      currentHitTable: TableType.PLAYER1,
      previousHitTable: null,
      lastHitRacket: PLAYER2_ID,
      target: CollisionTarget.FLOOR,
    };

    const result = judgement.judgeCollision(collision);
    expect(result.score.player1Score).toBe(0);
    expect(result.score.player2Score).toBe(0);
    expect(result.nextServingPlayer).toBe(playerTypeSchema.enum.PLAYER2);
    expect(result.gameOver).toBe(false);
  });
});

describe('게임 종료 관련', () => {
  it('PLAYER1이 11점 도달 시 gameOver=true, winner=PLAYER1', () => {
    const collision: CollisionData = {
      currentHitTable: TableType.PLAYER2,
      previousHitTable: TableType.PLAYER2,
      lastHitRacket: PLAYER1_ID,
      target: CollisionTarget.TABLE,
    };
    // 11점을 먼저 채우기
    for (let i = 0; i < 11; i++) {
      judgement.judgeCollision(collision);
    }
    const result = judgement.judgeCollision(collision);
    expect(result.score.player1Score).toBe(11);
    expect(result.score.player2Score).toBe(0);
    expect(result.gameOver).toBe(true);
    expect(result.winner).toBe(playerTypeSchema.enum.PLAYER1);
  });

  it('게임 종료 후 추가 충돌은 점수나 승자를 변경하지 않는다', () => {
    const collisionP2: CollisionData = {
      currentHitTable: TableType.PLAYER1,
      previousHitTable: TableType.PLAYER1,
      lastHitRacket: PLAYER2_ID,
      target: CollisionTarget.TABLE,
    };
    // P2가 11점 달성
    for (let i = 0; i < 11; i++) {
      judgement.judgeCollision(collisionP2);
    }
    const overResult = judgement.judgeCollision(collisionP2);
    expect(overResult.gameOver).toBe(true);
    expect(overResult.winner).toBe(playerTypeSchema.enum.PLAYER2);

    // 종료 후 P1 득점 시도
    const collisionP1: CollisionData = {
      currentHitTable: TableType.PLAYER2,
      previousHitTable: TableType.PLAYER2,
      lastHitRacket: PLAYER1_ID,
      target: CollisionTarget.TABLE,
    };
    const afterOver = judgement.judgeCollision(collisionP1);
    // 여전히 종료 상태, winner 유지
    expect(afterOver.gameOver).toBe(true);
    expect(afterOver.winner).toBe(playerTypeSchema.enum.PLAYER2);
  });
});

describe('첫 랠리 (서브권 결정)', () => {
  it('P1이 이기면 점수는 0-0, 다음 서브권자는 P1이 된다', () => {
    const collision: CollisionData = {
      /* P1이 이기는 상황 */ target: CollisionTarget.FLOOR,
      currentHitTable: TableType.PLAYER2,
      lastHitRacket: PLAYER1_ID,
      previousHitTable: null,
    };

    const result = judgement.judgeCollision(collision);

    // 새로운 규칙: 점수는 그대로
    expect(result.score.player1Score).toBe(0);
    expect(result.score.player2Score).toBe(0);
    // 서브권만 P1에게 넘어감
    expect(result.nextServingPlayer).toBe(playerTypeSchema.enum.PLAYER1);
    expect(result.gameOver).toBe(false);
  });

  it('P2가 이기면 점수는 0-0, 다음 서브권자는 P2가 된다', () => {
    const collision: CollisionData = {
      /* P2가 이기는 상황 */ target: CollisionTarget.FLOOR,
      currentHitTable: TableType.PLAYER1,
      lastHitRacket: PLAYER2_ID,
      previousHitTable: null,
    };

    const result = judgement.judgeCollision(collision);

    expect(result.score.player1Score).toBe(0);
    expect(result.score.player2Score).toBe(0);
    expect(result.nextServingPlayer).toBe(playerTypeSchema.enum.PLAYER2);
  });
});

describe('일반 득점 (두 번째 랠리부터)', () => {
  // 헬퍼: 첫 랠리를 진행하여 서브권자를 P1으로 확정
  const playFirstRallyForP1 = () => {
    judgement.judgeCollision({
      target: CollisionTarget.FLOOR,
      currentHitTable: TableType.PLAYER2,
      lastHitRacket: PLAYER1_ID,
      previousHitTable: null,
    });
  };

  it('P1이 첫 서브권을 얻은 후, P1이 다시 득점하면 1-0이 된다', () => {
    playFirstRallyForP1(); // P1이 서브권을 가짐

    // P1이 첫 득점
    const result = judgement.judgeCollision({
      target: CollisionTarget.FLOOR,
      currentHitTable: TableType.PLAYER2,
      lastHitRacket: PLAYER1_ID,
      previousHitTable: null,
    });

    expect(result.score.player1Score).toBe(1);
    expect(result.score.player2Score).toBe(0);
    expect(result.nextServingPlayer).toBe(playerTypeSchema.enum.PLAYER1); // 1점 득점 후 서브권 유지
  });
});

describe('게임 종료 관련', () => {
  const playPoint = (winner: PlayerType) => {
    const winnerId = winner === playerTypeSchema.enum.PLAYER1 ? PLAYER1_ID : PLAYER2_ID;
    const targetTable =
      winner === playerTypeSchema.enum.PLAYER1 ? TableType.PLAYER2 : TableType.PLAYER1;
    return judgement.judgeCollision({
      target: CollisionTarget.FLOOR,
      currentHitTable: targetTable,
      lastHitRacket: winnerId === PLAYER1_ID ? PLAYER2_ID : PLAYER1_ID,
      previousHitTable: null,
    });
  };

  it('P1이 11점 도달 시 게임이 종료된다 (첫 서브 랠리 포함)', () => {
    // 1번 (서브권) + 11번 (득점) = 총 12번의 랠리
    for (let i = 0; i < 12; i++) {
      playPoint(playerTypeSchema.enum.PLAYER1);
    }

    const result = judgement['createResult'](false);
    expect(result.score.player1Score).toBe(11);
    expect(result.score.player2Score).toBe(0);
    expect(result.gameOver).toBe(true);
    expect(result.winner).toBe(playerTypeSchema.enum.PLAYER1);
  });
});

describe('커버리지 확보용 테스트', () => {
  it('P2가 공을 쳐서 P1이 득점하는 상황을 테스트한다', () => {
    // onFloorHit의 if (lastHitRacket === this.player2Id) 블록 커버
    const result = judgement.judgeCollision({
      target: CollisionTarget.FLOOR,
      currentHitTable: null,
      lastHitRacket: PLAYER2_ID,
      previousHitTable: null,
    });
    // 첫 랠리라 점수는 0:0 이지만, P1이 이겼으므로 서브권은 P1
    expect(result.nextServingPlayer).toBe(playerTypeSchema.enum.PLAYER1);
  });
});
