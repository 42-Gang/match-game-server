import { TypeOf, z } from 'zod';

export const SwingTypeSchema = z.enum(['BACKSWING', 'DRIVE']);
export type SwingType = TypeOf<typeof SwingTypeSchema>;

export const PlayerInputSchema = z.object({
  x: z.number(),
  swing: SwingTypeSchema.optional(),
});
