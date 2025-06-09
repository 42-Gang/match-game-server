import { TypeOf, z } from 'zod';

export const swingTypeSchema = z.enum(['BACKSWING', 'DRIVE']);
export type SwingType = TypeOf<typeof swingTypeSchema>;

export const playerInputSchema = z.object({
  x: z.number(),
  swing: swingTypeSchema.optional(),
});
export type PlayerInputType = TypeOf<typeof playerInputSchema>;

const vec3Schema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
});

export const sessionStateSchema = z.object({
  ball: vec3Schema,
  racket1: vec3Schema,
  racket2: vec3Schema,
});
export type SessionStateType = TypeOf<typeof sessionStateSchema>;
