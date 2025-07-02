import { z } from 'zod';
import { playerTypeSchema } from '../../domain/game.schema.js';

export const socketGameEndSchema = z.object({
  winner: playerTypeSchema,
  winnerId: z.number(),
});
