import { RedisClient } from '../lib/RedisClient.js';
import { env } from './env.js';
import logger from './logger.js';

let client = null;

export function getRedisClient() {
  if (!client) {
    client = new RedisClient(env.redisUrl);
    client.on('error', (err) => {
      logger.error({ err }, 'Redis connection error');
    });
  }
  return client;
}

export async function checkRedisConnection() {
  const redis = getRedisClient();
  const pong = await redis.ping();
  return pong === 'PONG';
}

export default getRedisClient;
