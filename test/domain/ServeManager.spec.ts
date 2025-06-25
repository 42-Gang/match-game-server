import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ServeManager } from '../../src/domain/ServeManager.js';
import type { BaseLogger } from 'pino';

const playerTypeSchema = {
  enum: {
    PLAYER1: 'PLAYER1',
    PLAYER2: 'PLAYER2',
  },
};

type PlayerType = 'PLAYER1' | 'PLAYER2';
const PLAYER1 = playerTypeSchema.enum.PLAYER1 as PlayerType;
const PLAYER2 = playerTypeSchema.enum.PLAYER2 as PlayerType;

const mockLogger: BaseLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  fatal: vi.fn(),
  trace: vi.fn(),
  silent: vi.fn(),
  level: 'debug',
};

let serveManager: ServeManager;

beforeEach(() => {
  serveManager = new ServeManager(mockLogger);
  vi.clearAllMocks();
});

it('초기 서브권자는 PLAYER1으로 설정되어야 한다', () => {
  expect(serveManager.getServingPlayer()).toBe(PLAYER1);
});

it('첫 랠리의 승자가 PLAYER2일 경우, 서브권자는 PLAYER2가 되어야 한다', () => {
  serveManager.updateServer({
    scoringPlayer: PLAYER2,
    player1score: 0,
    player2score: 0,
  });

  expect(serveManager.getServingPlayer()).toBe(PLAYER2);
});

it('첫 랠리의 승자가 PLAYER1일 경우, 서브권자는 PLAYER1으로 유지되어야 한다', () => {
  serveManager.updateServer({
    scoringPlayer: PLAYER1,
    player1score: 0,
    player2score: 0,
  });

  expect(serveManager.getServingPlayer()).toBe(PLAYER1);
});

describe('첫 서브 이후의 서브권 전환', () => {
  it('매 2점마다 서브권이 전환되어야 한다', () => {
    serveManager.updateServer({
      scoringPlayer: PLAYER1,
      player1score: 0,
      player2score: 0,
    }); // 서브 게임
    expect(serveManager.getServingPlayer()).toBe(PLAYER1);

    serveManager.updateServer({
      // PLAYER2 득점
      scoringPlayer: PLAYER2,
      player1score: 0,
      player2score: 1,
    });
    serveManager.updateServer({
      // PLAYER2 득점
      scoringPlayer: PLAYER2,
      player1score: 0,
      player2score: 2,
    });

    expect(serveManager.getServingPlayer()).toBe(PLAYER2);
  });

  it('누가 득점했는지와 관계없이 서브권이 올바르게 전환되어야 한다', () => {
    serveManager.updateServer({
      scoringPlayer: PLAYER1,
      player1score: 0,
      player2score: 0,
    }); // 서브 게임
    expect(serveManager.getServingPlayer()).toBe(PLAYER1);

    serveManager.updateServer({
      // PLAYER2 득점
      scoringPlayer: PLAYER1,
      player1score: 1,
      player2score: 0,
    });
    serveManager.updateServer({
      // PLAYER2 득점
      scoringPlayer: PLAYER2,
      player1score: 1,
      player2score: 1,
    });

    expect(serveManager.getServingPlayer()).toBe(PLAYER2);
  });
});
