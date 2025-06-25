import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ScoreManager } from '../../src/domain/ScoreManager.js';

const playerTypeSchema = {
  enum: {
    PLAYER1: 'PLAYER1',
    PLAYER2: 'PLAYER2',
  },
};
type PlayerType = 'PLAYER1' | 'PLAYER2';
const PLAYER1 = playerTypeSchema.enum.PLAYER1 as PlayerType;
const PLAYER2 = playerTypeSchema.enum.PLAYER2 as PlayerType;

describe('ScoreManager', () => {
  let scoreManager: ScoreManager;

  beforeEach(() => {
    vi.clearAllMocks();
    scoreManager = new ScoreManager();
  });

  it('초기화 시 점수를 0-0으로 올바르게 설정해야 한다', () => {
    const scoreDto = scoreManager.getScoreDto();
    expect(scoreDto).toEqual({ player1score: 0, player2score: 0 });
  });

  it('update 호출 시 플레이어1의 점수를 올바르게 증가시켜야 한다', () => {
    scoreManager.update(PLAYER1);

    const scoreDto = scoreManager.getScoreDto();
    expect(scoreDto).toEqual({ player1score: 1, player2score: 0 });
  });

  it('update 호출 시 플레이어2의 점수를 올바르게 증가시켜야 한다', () => {
    scoreManager.update(PLAYER2);

    const scoreDto = scoreManager.getScoreDto();
    expect(scoreDto).toEqual({ player1score: 0, player2score: 1 });
  });

  it('getWinner를 호출하면 현재 Score 객체의 getWinner를 대신 호출해야 한다', () => {
    for (let i = 0; i < 11; i++) {
      scoreManager.update(PLAYER1);
    }

    expect(scoreManager.getScoreDto()).toEqual({ player1score: 11, player2score: 0 });
    expect(scoreManager.getWinner()).toBe(PLAYER1);
  });
});
