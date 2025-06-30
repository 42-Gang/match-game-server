import {
  matchRequestMessageSchema,
  MatchRequestMessageType,
} from '../schemas/match.topic.schema.js';
import { Logger } from 'pino';
import GameSession from '../../../domain/GameSession.js';
import { matchCreatedProducer } from '../producers/match.topic.producer.js';

export default class MatchTopicService {
  constructor(
    private readonly logger: Logger,
    private readonly gameSession: GameSession,
    private readonly scoreToWin: number,
  ) {}

  async handleMatchRequest(messageValue: MatchRequestMessageType) {
    matchRequestMessageSchema.parse(messageValue);
    this.logger.info(messageValue, 'Received match request message:');

    this.gameSession.createGameSession({
      tournamentId: messageValue.tournamentId,
      matchId: messageValue.matchId,
      player1Id: messageValue.player1Id,
      player2Id: messageValue.player2Id,
      scoreToWin: this.scoreToWin,
    });

    // 게임 생성 결과 전달
    await matchCreatedProducer({
      tournamentId: messageValue.tournamentId,
      matchId: messageValue.matchId,
      matchServerName: messageValue.matchServerName,
      player1Id: messageValue.player1Id,
      player2Id: messageValue.player2Id,
    });
  }
}
