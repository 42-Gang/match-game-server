export default class GameResult {
  constructor(
    public winnerId: string,
    public finalScore: Record<string, number>,
  ) {}
}
