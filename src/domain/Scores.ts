import Score from './Score.js';

export default class Scores {
  private readonly scores: Score[];

  constructor() {
    this.scores = [new Score(0, 0)];
  }

  addScore(score: Score): void {
    this.scores.push(score);
  }

  getLatestScore(): Score {
    return this.scores[this.scores.length - 1];
  }
}
