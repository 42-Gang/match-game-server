export default class Score {
  private points: Record<string, number> = {};

  constructor(players: string[]) {
    players.forEach((id) => (this.points[id] = 0));
  }

  addPoint(playerId: string) {
    this.points[playerId] = (this.points[playerId] || 0) + 1;
  }

  getPoints(): Record<string, number> {
    return { ...this.points };
  }

  hasWinner(): boolean {
    return Object.values(this.points).some((p) => p >= 11);
  }

  getWinner(): string | null {
    const winner = Object.entries(this.points).find(([_, p]) => p >= 11);
    return winner ? winner[0] : null;
  }
}
