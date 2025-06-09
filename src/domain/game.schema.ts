import { TypeOf, z } from 'zod';

export const swingTypeSchema = z.enum(['BACKSWING', 'DRIVE']);
export type SwingType = TypeOf<typeof swingTypeSchema>;

export const playerInputSchema = z.object({
  x: z.number(),
  swing: swingTypeSchema.optional(),
});
export type PlayerInputType = TypeOf<typeof playerInputSchema>;
