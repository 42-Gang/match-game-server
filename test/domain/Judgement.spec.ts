import { TableType } from '../../src/domain/physics/Table.js';
import { playerTypeSchema } from '../../src/domain/game.schema.js';
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
  expect(result.score.player1score).toBe(0);
  expect(result.score.player2score).toBe(0);
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
    expect(result.score.player1score).toBe(0);
    expect(result.score.player2score).toBe(0);
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
    expect(result.score.player1score).toBe(0);
    expect(result.score.player2score).toBe(0);
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
    expect(result.score.player1score).toBe(0);
    expect(result.score.player2score).toBe(0);
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
    expect(result.score.player1score).toBe(0);
    expect(result.score.player2score).toBe(0);
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
    expect(result.score.player1score).toBe(11);
    expect(result.score.player2score).toBe(0);
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
