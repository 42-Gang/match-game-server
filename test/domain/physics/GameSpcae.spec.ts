import Ball from '../../../src/domain/physics/Ball.js';
import Table from '../../../src/domain/physics/Table.js';
import Racket from '../../../src/domain/physics/Racket.js';
import GameSpace from '../../../src/domain/physics/GameSpace.js';
import * as CANNON from 'cannon-es';
import { beforeEach, it, vi } from 'vitest';

beforeEach(() => {
  ball = new Ball();
  const table = new Table();
  const racket1 = new Racket(1, new CANNON.Vec3(-0.5, 0.2, 0));
  const racket2 = new Racket(2, new CANNON.Vec3(0.5, 0.2, 0));
  gameSpace = new GameSpace(ball, table, racket1, racket2);
});

let gameSpace: GameSpace;
let ball: Ball;
const fixedTimeStep = 1 / 60; // 60Hz
const maxSteps = 300; // 약 5초간(300프레임) 실행

it('ball should bounce off the table', async () => {
  vi.useRealTimers();

  for (let i = 0; i < maxSteps; i++) {
    gameSpace.step(fixedTimeStep);

    // 매 스텝마다 y좌표 출력 (콘솔에서 튕김 확인)
    const t = (i * fixedTimeStep).toFixed(2);
    const y = ball.body.position.y.toFixed(3);
    console.log(`t=${t}s, y=${y}m`);
  }
});
