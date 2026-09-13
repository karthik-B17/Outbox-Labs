import { Queue, Worker, Job } from 'bullmq';
import { createRedisConnection } from '../config/redis';
import { config } from '../config';
import { sendEmail, indexEmail } from './emailService';
import { RateLimiter } from './rateLimiter';
import { SlackService } from './slackService';
import prisma from '../config/database';
import { EmailStatus, JobStatus } from '@prisma/client';

const queueName = 'email-scheduler';

export const emailQueue = new Queue(queueName, {
  connection: createRedisConnection(),
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
});

export const scheduleEmail = async (
  emailId: string,
  scheduledAt: Date,
  sender: string
): Promise<string> => {
  const delay = scheduledAt.getTime() - Date.now();

  const job = await emailQueue.add(
    'send-email',
    { emailId, sender },
    {
      delay: Math.max(0, delay),
      jobId: emailId,
    }
  );

  return job.id!;
};

export const createWorker = () => {
  const worker = new Worker(
    queueName,
    async (job: Job) => {
      const { emailId, sender } = job.data;
      console.log(`Processing email job: ${emailId}`);

      try {
        // Get email from database
        const email = await prisma.email.findUnique({
          where: { id: emailId },
        });

        if (!email) {
          throw new Error(`Email not found: ${emailId}`);
        }

        if (email.status === EmailStatus.SENT) {
          console.log(`Email already sent: ${emailId}`);
          return { skipped: true };
        }

        // Check rate limit
        const rateLimitCheck = await RateLimiter.canSend(sender);

        if (!rateLimitCheck.allowed) {
          console.log(`Rate limit reached for ${sender}, rescheduling...`);

          // Notify via Slack
          await SlackService.notifyRateLimit(
            email.userId,
            sender,
            config.rateLimit.maxPerSenderPerHour,
            rateLimitCheck.resetAt
          );

          // Reschedule to next hour
          const nextHour = await RateLimiter.rescheduleToNextHour(sender);
          const newDelay = nextHour.getTime() - Date.now();

          // Update email status
          await prisma.email.update({
            where: { id: emailId },
            data: { scheduledAt: nextHour },
          });

          // Re-add to queue with new delay
          await emailQueue.add(
            'send-email',
            { emailId, sender },
            {
              delay: Math.max(0, newDelay),
              jobId: `rescheduled-${emailId}-${Date.now()}`,
            }
          );

          return { rescheduled: true, nextAttempt: nextHour };
        }

        // Update status to SENDING
        await prisma.email.update({
          where: { id: emailId },
          data: { status: EmailStatus.SENDING },
        });

        // Send email
        const result = await sendEmail({
          to: email.to,
          subject: email.subject,
          body: email.body,
          from: email.from,
        });

        // Increment rate limiter
        await RateLimiter.increment(sender);

        // Update email status to SENT
        await prisma.email.update({
          where: { id: emailId },
          data: {
            status: EmailStatus.SENT,
            sentAt: new Date(),
          },
        });

        // Index in Elasticsearch
        await indexEmail({
          id: email.id,
          userId: email.userId,
          from: email.from,
          to: email.to,
          subject: email.subject,
          body: email.body,
          status: EmailStatus.SENT,
          sentAt: new Date(),
          createdAt: email.createdAt,
        });

        console.log(`Email sent successfully: ${emailId}`);
        return { success: true, previewUrl: result.previewUrl };
      } catch (error) {
        console.error(`Failed to send email ${emailId}:`, error);

        // Update status to FAILED
        await prisma.email.update({
          where: { id: emailId },
          data: { status: EmailStatus.FAILED },
        });

        throw error;
      }
    },
    {
      connection: createRedisConnection(),
      concurrency: config.worker.concurrency,
      limiter: {
        max: 10,
        duration: config.worker.minDelay,
      },
    }
  );

  worker.on('completed', (job) => {
    console.log(`Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} failed:`, err.message);
  });

  return worker;
};
