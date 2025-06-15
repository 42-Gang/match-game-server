import { producer } from '../../kafka.js';
import {
  handleMatchCreatedInputSchema,
  handleMatchResultInputSchema,
} from '../schemas/match.topic.schema.js';
import { MATCH_EVENTS, TOPICS } from '../constants.js';

export async function matchCreatedProducer(input: {
  matchId: number;
  matchServerName: string;
  player1Id: number;
  player2Id: number;
  player2SocketId: string;
}) {
  const message = handleMatchCreatedInputSchema.parse({
    tournamentId: input.matchId,
    matchId: input.matchId,
    serverName: input.matchServerName,
    player1Id: input.player1Id,
    player2Id: input.player2Id,
  });

  await producer.send({
    topic: TOPICS.MATCH,
    messages: [
      {
        value: JSON.stringify({
          eventType: MATCH_EVENTS.CREATED,
          ...message,
        }),
      },
    ],
  });
}

// TODO: 게임 결과 발생 이벤트 발생
export async function matchResultProducer(input: {
  tournamentId: number;
  matchId: number;
  player1Id: number;
  player2Id: number;
  score: {
    player1: number;
    player2: number;
  };
  winnerId: number;
  loserId: number;
  round: number;
}) {
  const message = handleMatchResultInputSchema.parse({
    tournamentId: input.tournamentId,
    matchId: input.matchId,
    player1Id: input.player1Id,
    player2Id: input.player2Id,
    score: {
      player1: input.score.player1,
      player2: input.score.player2,
    },
    winnerId: input.winnerId,
    loserId: input.loserId,
    round: input.round,
  });

  await producer.send({
    topic: TOPICS.MATCH,
    messages: [
      {
        value: JSON.stringify({
          eventType: MATCH_EVENTS.RESULT,
          ...message,
        }),
      },
    ],
  });
}
