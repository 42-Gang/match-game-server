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

export const handleMatchCreatedInputSchema = z.object({
  tournamentId: z.number(),
  matchId: z.number(),
  serverName: z.string(),
  player1Id: z.number(),
  player2Id: z.number(),
});

export type HandleMatchCreatedInputType = TypeOf<typeof handleMatchCreatedInputSchema>;

export const handleMatchResultInputSchema = z.object({
  tournamentId: z.number(),
  matchId: z.number(),
  player1Id: z.number(),
  player2Id: z.number(),
  score: z.object({
    player1: z.number(),
    player2: z.number(),
  }),
  winnerId: z.number(),
  loserId: z.number(),
  round: z.number(),
});
export type HandleMatchResultInputType = TypeOf<typeof handleMatchResultInputSchema>;
