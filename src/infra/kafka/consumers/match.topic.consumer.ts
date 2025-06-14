import { KafkaTopicConsumer } from './kafka.topic.consumer.js';
import { MATCH_EVENTS, TOPICS } from '../constants.js';
import { Logger } from 'pino';
import MatchTopicService from './match.topic.service.js';

export default class MatchTopicConsumer implements KafkaTopicConsumer {
  fromBeginning: boolean = false;
  topic: string = TOPICS.MATCH;

  constructor(
    private readonly logger: Logger,
    private readonly matchTopicService: MatchTopicService,
  ) {}

  async handle(messageValue: string): Promise<void> {
    const parsedMessage = this.parseMessage(messageValue);
    this.logger.info(parsedMessage, 'Received match message:');

    if (parsedMessage.eventType === MATCH_EVENTS.REQUEST) {
      await this.matchTopicService.handleMatchRequest(parsedMessage);
    }
  }

  private parseMessage(messageValue: string) {
    try {
      return JSON.parse(messageValue);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to parse message: ${msg}`);
    }
  }
}
