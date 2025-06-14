import {
  matchRequestMessageSchema,
  MatchRequestMessageType,
} from '../schemas/match.topic.schema.js';
import { Logger } from 'pino';
import GameSession from '../../../domain/GameSession.js';

export default class MatchTopicService {
  constructor(
    private readonly logger: Logger,
    private readonly gameSession: GameSession,
  ) {}

  async handleMatchRequest(messageValue: MatchRequestMessageType) {
    matchRequestMessageSchema.parse(messageValue);
    this.logger.info(messageValue, 'Received match request message:');

    this.gameSession.createGameSpace({
      tournamentId: messageValue.tournamentId,
      matchId: messageValue.matchId,
      player1Id: messageValue.player1Id,
      player2Id: messageValue.player2Id,
    });

    // TODO: 게임 생성 후, producer로 게임 생성 완료 메시지 전송
  }
}
