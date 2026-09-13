import express from 'express';
import cors from 'cors';
import session from 'express-session';
import passport from 'passport';
import { config } from './config';
import prisma from './config/database';
import { createRedisConnection } from './config/redis';
import { createEmailIndex } from './config/elastic';
import { createWorker, emailQueue } from './services/scheduler';
import { createTransporter } from './services/emailService';
import authRoutes from './routes/auth';
import emailRoutes from './routes/emails';
import slackRoutes from './routes/slack';
import queueRoutes from './routes/queue';

const app = express();

// Middleware
app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
}));
app.use(express.json());
app.use(session({
  secret: config.jwtSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
}));
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use('/auth', authRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/slack', slackRoutes);
app.use('/api/queue', queueRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const startServer = async () => {
  try {
    // Connect to database
    await prisma.$connect();
    console.log('Connected to PostgreSQL');

    // Create Elasticsearch index
    await createEmailIndex();

    // Create Ethereal Email transporter
    await createTransporter();

    // Start BullMQ worker
    createWorker();
    console.log('BullMQ worker started');

    // Resume any delayed jobs (for persistence after restart)
    const delayedJobs = await emailQueue.getDelayed();
    console.log(`Found ${delayedJobs.length} delayed jobs to resume`);

    // Start server
    app.listen(config.port, () => {
      console.log(`Server running on port ${config.port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
