import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000'),
  databaseUrl: process.env.DATABASE_URL!,
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  jwtSecret: process.env.JWT_SECRET || 'default-secret',
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackUrl: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/auth/google/callback',
  },
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  rateLimit: {
    maxPerHour: parseInt(process.env.MAX_EMAILS_PER_HOUR || '200'),
    maxPerSenderPerHour: parseInt(process.env.MAX_EMAILS_PER_HOUR_PER_SENDER || '50'),
  },
  worker: {
    concurrency: parseInt(process.env.WORKER_CONCURRENCY || '5'),
    minDelay: parseInt(process.env.MIN_DELAY_BETWEEN_EMAILS || '2000'),
  },
  elastic: {
    url: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
  },
};
