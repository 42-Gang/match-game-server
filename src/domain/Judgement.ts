import Score from './Score.js';
import Scores from './Scores.js';

export default class Judgement {
  constructor(private readonly scores: Scores) {
    scores.addScore(new Score(0, 0));
  }

  getCurrentScore(): Score {
    return this.scores.getLatestScore();
  }
}
