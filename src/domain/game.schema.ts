import { TypeOf, z } from 'zod';

export const playerInputSchema = z.object({
  x: z.number(),
});
export type PlayerInputType = TypeOf<typeof playerInputSchema>;

const vec3Schema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
});

export const gameObjectsPositionsSchema = z.object({
  ball: vec3Schema,
  racket1: vec3Schema,
  racket2: vec3Schema,
});
export type GameObjectsPositionsType = TypeOf<typeof gameObjectsPositionsSchema>;

export const scoreSchema = z.object({
  player1score: z.number(),
  player2score: z.number(),
});
export type ScoreDto = TypeOf<typeof scoreSchema>;

export const playerTypeSchema = z.enum(['PLAYER1', 'PLAYER2']);
export type PlayerType = TypeOf<typeof playerTypeSchema>;
