import {
  matchRequestMessageSchema,
  MatchRequestMessageType,
} from '../schemas/match.topic.schema.js';
import { Logger } from 'pino';

export default class MatchTopicService {
  constructor(private readonly logger: Logger) {}

  async handleMatchRequest(messageValue: MatchRequestMessageType) {
    matchRequestMessageSchema.parse(messageValue);

    this.logger.info(messageValue, 'Received match request message:');
  }
}
