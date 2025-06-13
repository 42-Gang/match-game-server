import Scores from '../../src/domain/Scores.js';
import Judgement from '../../src/domain/Judgement.js';
import { SessionStateType } from '../../src/domain/game.schema.js';
import { describe, it, expect, beforeEach } from 'vitest';
import Score from '../../src/domain/Score.js';

let scores: Scores;
let judgement: Judgement;

beforeEach(() => {
  scores = new Scores();
  judgement = new Judgement(scores);
});

it('초기 스코어는 0:0 이어야 한다', () => {
  const dto = judgement.getCurrentScore().toScoreDto();
  expect(dto).toEqual({ player1score: 0, player2score: 0 });
});

it('ball.x < -halfLength 이면 PLAYER2 가 득점해야 한다', () => {
  const half = 20 / 2;
  const state: SessionStateType = {
    ball: { x: -half - 1, y: 0, z: 0 },
    racket1: { x: 0, y: 0, z: 0 },
    racket2: { x: 0, y: 0, z: 0 },
  };

  const result = judgement.judgeBallPosition(state);
  expect(result.winner).toBe('PLAYER2');
  expect(result.score.toScoreDto()).toEqual({
    player1score: 0,
    player2score: 1,
  });
});

it('ball.x > halfLength 이면 PLAYER1 가 득점해야 한다', () => {
  const half = 20 / 2;
  const state: SessionStateType = {
    ball: { x: half + 1, y: 0, z: 0 },
    racket1: { x: 0, y: 0, z: 0 },
    racket2: { x: 0, y: 0, z: 0 },
  };

  const result = judgement.judgeBallPosition(state);
  expect(result.winner).toBe('PLAYER1');
  expect(result.score.toScoreDto()).toEqual({
    player1score: 1,
    player2score: 0,
  });
});

it('테이블 범위 내에 있으면 득점 없이 null 을 반환해야 한다', () => {
  const state: SessionStateType = {
    ball: { x: 0, y: 0, z: 0 },
    racket1: { x: 0, y: 0, z: 0 },
    racket2: { x: 0, y: 0, z: 0 },
  };

  const result = judgement.judgeBallPosition(state);
  expect(result.winner).toBeNull();
  expect(result.score.toScoreDto()).toEqual({
    player1score: 0,
    player2score: 0,
  });
});

describe('isGameOver()', () => {
  it('11점 이상이고 2점 차이일 때 game over 여야 한다', () => {
    // Scores 에 임의로 스코어 추가
    for (let i = 1; i <= 11; i++) {
      scores.addScore(new Score(i, i - 1)); // 1:0, 2:1, …, 11:10
    }
    // 11:10 은 차이가 1점 → 아직 종료 아님
    expect(judgement.isGameOver()).toBe(false);

    // 12:10 으로 점수 추가
    scores.addScore(new Score(12, 10));
    expect(judgement.isGameOver()).toBe(true);
  });

  it('11:9 경우 바로 종료되어야 한다', () => {
    scores.addScore(new Score(11, 9));
    expect(judgement.isGameOver()).toBe(true);
  });
});
