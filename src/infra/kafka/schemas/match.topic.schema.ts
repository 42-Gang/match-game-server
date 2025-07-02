import { TypeOf, z } from 'zod';

export const matchRequestMessageSchema = z.object({
  tournamentId: z.number(),
  matchId: z.number(),
  matchServerName: z.string(),
  player1Id: z.number(),
  player2Id: z.number(),
  timestamp: z.string().datetime(),
});

export type MatchRequestMessageType = TypeOf<typeof matchRequestMessageSchema>;

export const matchCreatedProducingInputSchema = z.object({
  tournamentId: z.number(),
  matchId: z.number(),
  serverName: z.string(),
  player1Id: z.number(),
  player2Id: z.number(),
});

export type HandleMatchCreatedInputType = TypeOf<typeof matchCreatedProducingInputSchema>;

export const matchResultProducingInputSchema = z.object({
  matchId: z.number(),
  player1Id: z.number(),
  player2Id: z.number(),
  score: z.object({
    player1: z.number(),
    player2: z.number(),
  }),
  winnerId: z.number(),
  loserId: z.number(),
});
export type HandleMatchResultInputType = TypeOf<typeof matchResultProducingInputSchema>;
