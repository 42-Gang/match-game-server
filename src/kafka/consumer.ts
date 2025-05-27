import { kafka } from '../plugins/kafka.js';
import { KafkaTopicConsumer } from './consumers/kafka.topic.consumer.js';
import pino from 'pino';
import BaseLogger = pino.BaseLogger;

export async function startConsumer(topicConsumers: KafkaTopicConsumer[], logger: BaseLogger) {
  const consumer = kafka.consumer({ groupId: 'MAIN_GAME_SERVER', sessionTimeout: 10000 });
  await consumer.connect();

  for (const topicConsumer of topicConsumers) {
    await consumer.subscribe({
      topic: topicConsumer.topic,
      fromBeginning: topicConsumer.fromBeginning,
    });
  }

  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      if (!message.value) {
        return logger.warn(`Null message received on topic ${topic}`);
      }

      const handler = topicConsumers.find((h) => h.topic === topic);
      if (!handler) {
        return logger.warn(`No handler found for topic ${topic}`);
      }

      try {
        await handler.handle(message.value.toString());
      } catch (error) {
        logger.error(error, `❌ Error handling message from topic ${topic}:`);
        logger.error(message.value.toString(), 'Raw message:');
      }
    },
  });
}
