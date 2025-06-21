import { z } from 'zod';

export const socketPlayerIdSchema = z.object({
  playerId: z.number(),
});
