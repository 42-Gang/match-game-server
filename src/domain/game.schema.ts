import { TypeOf, z } from 'zod';

export const SwingTypeSchema = z.enum(['BACKSWING', 'DRIVE']);
export type SwingType = TypeOf<typeof SwingTypeSchema>;
