import Redis from 'ioredis';
import { config } from './index';

export const redis = new Redis(config.redisUrl, {
  maxRetriesPerRequest: null,
});

export const createRedisConnection = () => {
  return new Redis(config.redisUrl, {
    maxRetriesPerRequest: null,
  });
};
