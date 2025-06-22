import { z } from 'zod';

export const socketMatchTimeoutSchema = z.object({
  missingPlayerId: z.number(),
  waitingTimeInSeconds: z.number().min(0, 'Waiting time must be a non-negative number'),
  reason: z.string().optional(),
});
