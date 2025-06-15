import { producer } from '../../kafka.js';
import { handleMatchCreatedInputSchema } from '../schemas/match.topic.schema.js';
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
