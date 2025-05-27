export {};

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      REDIS_HOST: string;
      REDIS_PORT: string;
      KAFKA_BROKER: string;

      PORT: string;
      SERVER_NAME: string;
    }
  }
}
