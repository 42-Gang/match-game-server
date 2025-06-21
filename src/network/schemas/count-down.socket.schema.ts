import { z } from 'zod';

export const socketCountDownSchema = z.object({
  count: z.number().min(0).max(3).describe('Count down value for the game start countdown'),
});
