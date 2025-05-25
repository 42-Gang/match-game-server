import { Kafka } from 'kafkajs';
import * as process from 'node:process';

export const kafka = new Kafka({
  brokers: process.env.KAFKA_BROKER.split(','),
  ssl: false,
});
export const producer = kafka.producer();

(async () => {
  try {
    await producer.connect();
  } catch (error) {
    console.error('Failed to connect to Kafka producer:', error);
  }
})();
