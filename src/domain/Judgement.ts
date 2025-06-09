import Score from './Score.js';
import Scores from './Scores.js';

export default class Judgement {
  constructor(private readonly scores: Scores) {
    scores.addScore(new Score(0, 0));
  }

  getCurrentScore(): Score {
    return this.scores.getLatestScore();
  }

  judgeBallPosition(): {
    // TODO: 탁구대와 공의 위치를 비교하여 승자 결정
  };

  isGameOver(): boolean {
    // TODO: 매치 종료 여부 판단
    return false; // 임시 구현
  }
}
