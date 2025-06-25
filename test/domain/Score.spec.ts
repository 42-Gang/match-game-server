import { describe, it, expect } from 'vitest';
import Score from '../../src/domain/Score.js';
import { playerTypeSchema } from '../../src/domain/game.schema.js';

it('음수 스코어 입력 시 에러를 던진다', () => {
  expect(() => new Score(-1, 0)).toThrow('Scores cannot be negative');
  expect(() => new Score(0, -5)).toThrow('Scores cannot be negative');
});

it('toScoreDto는 올바른 DTO를 반환한다', () => {
  const score = new Score(3, 5);
  const dto = score.toScoreDto();
  expect(dto).toEqual({ player1score: 3, player2score: 5 });
});

describe('isGameOver 메서드', () => {
  it('11점 미만에서는 false', () => {
    expect(new Score(10, 9).isGameOver()).toBe(false);
    expect(new Score(9, 10).isGameOver()).toBe(false);
    expect(new Score(0, 0).isGameOver()).toBe(false);
  });

  it('한쪽이 11점 이상이지만 점수 차가 2미만이면 false', () => {
    expect(new Score(11, 10).isGameOver()).toBe(false);
    expect(new Score(10, 11).isGameOver()).toBe(false);
  });

  it('한쪽이 11점 이상이고 점수 차가 2이상이면 true', () => {
    expect(new Score(11, 9).isGameOver()).toBe(true);
    expect(new Score(12, 10).isGameOver()).toBe(true);
    expect(new Score(0, 12).isGameOver()).toBe(true);
  });
});

describe('getWinner 메서드', () => {
  it('게임이 종료되지 않은 경우 에러를 던진다', () => {
    expect(() => new Score(5, 5).getWinner()).toThrow('Game is not over yet');
  });

  it('점수 차이가 2이상인 경우 올바른 승자를 반환한다', () => {
    expect(new Score(11, 9).getWinner()).toBe(playerTypeSchema.enum.PLAYER1);
    expect(new Score(9, 11).getWinner()).toBe(playerTypeSchema.enum.PLAYER2);
  });

  it('동점인 경우 에러를 던진다', () => {
    // 11-11에서도 동점이므로 getWinner 호출 시 에러
    expect(() => new Score(11, 11).getWinner()).toThrow('Game is not over yet');
  });
});
