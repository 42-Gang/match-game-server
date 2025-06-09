import Score from './Score.js';

export default class Judgement {
  /**
   * 점수 판정: 공이 y축 아래로 떨어지면 점수 판정
   * 간단히 양쪽 플레이어 ID를 받아 point 수여
   */
  getPoint(scoringPlayerId: string, score: Score): void {
    score.addPoint(scoringPlayerId);
  }
}
