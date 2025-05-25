import { kafka } from '../plugins/kafka.js';
import { KafkaTopicConsumer } from './consumers/kafka.topic.consumer.js';
import { logger } from '../plugins/logger.js';

export async function startConsumer() {
  const consumer = kafka.consumer({ groupId: 'MAIN_GAME_SERVER', sessionTimeout: 10000 });
  const topicConsumers: KafkaTopicConsumer[] = [];

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
        return console.warn(`Null message received on topic ${topic}`);
      }

      const handler = topicConsumers.find((h) => h.topic === topic);
      if (!handler) {
        return console.warn(`No handler found for topic ${topic}`);
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
