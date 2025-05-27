import { createClient } from 'redis';

const REDIS_HOST = process.env.REDIS_HOST;
const REDIS_PORT = Number(process.env.REDIS_PORT);

export const redis = createClient({ url: `redis://${REDIS_HOST}:${REDIS_PORT}` });
await redis.connect();
