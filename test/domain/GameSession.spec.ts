import GameSession from '../../src/domain/GameSession.js';
import GameSpace from '../../src/domain/physics/GameSpace.js';
import * as CANNON from 'cannon-es';
import Ball from '../../src/domain/physics/Ball.js';
import Table from '../../src/domain/physics/Table.js';
import Racket from '../../src/domain/physics/Racket.js';
import Judgement from '../../src/domain/Judgement.js';
import Scores from '../../src/domain/Scores.js';
import { beforeEach, it } from 'vitest';
import Players from '../../src/domain/Players.js';

beforeEach(() => {
  const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.81, 0) });
  const ball = new Ball();
  const table = new Table();
  const racket1 = new Racket(1, new CANNON.Vec3(-0.5, 0.2, 0));
  const racket2 = new Racket(2, new CANNON.Vec3(0.5, 0.2, 0));

  const physicsEngine = new GameSpace(world, ball, table, racket1, racket2);
  const scores = new Scores();
  const judgement = new Judgement(scores);

  const players = new Players(1, 2);

  gameSession = new GameSession(1, physicsEngine, players, judgement);
});

let gameSession: GameSession;

it('should ', () => {
  console.log(gameSession.getState());
});
