import { Router, Response } from 'express';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import prisma from '../config/database';
import { AuthRequest, authenticate } from '../middleware/auth';
import { scheduleEmail, emailQueue } from '../services/scheduler';
import { indexEmail, searchEmails } from '../services/emailService';
import { config } from '../config';
import { EmailStatus } from '@prisma/client';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Get all emails for user
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { status, page = '1', limit = '20', search } = req.query;
    const userId = req.userId!;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = { userId };
    if (status) {
      where.status = status;
    }

    const [emails, total] = await Promise.all([
      prisma.email.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.email.count({ where }),
    ]);

    // If search query, use Elasticsearch
    if (search) {
      const elasticResults = await searchEmails(userId, search as string, status as string);
      res.json({
        emails: elasticResults,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: elasticResults.length,
          pages: Math.ceil(elasticResults.length / limitNum),
        },
      });
      return;
    }

    res.json({
      emails,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch emails' });
  }
});

// Get scheduled emails count
router.get('/counts', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const [scheduled, sent] = await Promise.all([
      prisma.email.count({
        where: { userId, status: EmailStatus.SCHEDULED },
      }),
      prisma.email.count({
        where: { userId, status: EmailStatus.SENT },
      }),
    ]);

    res.json({ scheduled, sent });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch counts' });
  }
});

// Parse CSV and return emails
router.post(
  '/parse-csv',
  authenticate,
  upload.single('file'),
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }

      const content = req.file.buffer.toString('utf-8');
      const records = parse(content, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });

      // Extract email addresses from common column names
      const emails: string[] = [];
      for (const record of records) {
        const email =
          record.email ||
          record.Email ||
          record.EMAIL ||
          record['email address'] ||
          record['Email Address'] ||
          Object.values(record).find((v) =>
            typeof v === 'string' && v.includes('@')
          );

        if (email && typeof email === 'string' && email.includes('@')) {
          emails.push(email.trim());
        }
      }

      res.json({
        emails,
        count: emails.length,
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to parse CSV' });
    }
  }
);

// Create and schedule email
router.post('/schedule', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const {
      recipients,
      subject,
      body,
      scheduledAt,
      delayBetween,
      hourlyLimit,
    } = req.body;

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      res.status(400).json({ error: 'At least one recipient is required' });
      return;
    }

    if (!subject || !body) {
      res.status(400).json({ error: 'Subject and body are required' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    const fromEmail = user?.email || 'noreply@example.com';

    const createdEmails = [];

    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];
      const delay = i * (delayBetween || 2) * 1000;
      const jobScheduledAt = new Date(
        new Date(scheduledAt).getTime() + delay
      );

      // Create email in database
      const email = await prisma.email.create({
        data: {
          userId,
          from: fromEmail,
          to: recipient,
          subject,
          body,
          status: EmailStatus.SCHEDULED,
          scheduledAt: jobScheduledAt,
          hourlyLimit: hourlyLimit || config.rateLimit.maxPerSenderPerHour,
          delayBetween: delayBetween || 2,
        },
      });

      // Schedule with BullMQ
      const jobId = await scheduleEmail(
        email.id,
        jobScheduledAt,
        fromEmail
      );

      // Update email with job ID
      await prisma.email.update({
        where: { id: email.id },
        data: { jobId },
      });

      // Index in Elasticsearch
      await indexEmail({
        id: email.id,
        userId,
        from: fromEmail,
        to: recipient,
        subject,
        body,
        status: EmailStatus.SCHEDULED,
        scheduledAt: jobScheduledAt,
        createdAt: email.createdAt,
      });

      createdEmails.push(email);
    }

    res.status(201).json({
      message: `${createdEmails.length} email(s) scheduled successfully`,
      emails: createdEmails,
    });
  } catch (error) {
    console.error('Schedule error:', error);
    res.status(500).json({ error: 'Failed to schedule emails' });
  }
});

// Cancel scheduled email
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const email = await prisma.email.findFirst({
      where: { id, userId },
    });

    if (!email) {
      res.status(404).json({ error: 'Email not found' });
      return;
    }

    if (email.status !== EmailStatus.SCHEDULED) {
      res.status(400).json({ error: 'Only scheduled emails can be cancelled' });
      return;
    }

    // Remove from queue
    if (email.jobId) {
      const job = await emailQueue.getJob(email.jobId);
      if (job) {
        await job.remove();
      }
    }

    // Update status
    await prisma.email.update({
      where: { id },
      data: { status: EmailStatus.FAILED },
    });

    res.json({ message: 'Email cancelled' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to cancel email' });
  }
});

// Get single email
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const email = await prisma.email.findFirst({
      where: { id, userId },
    });

    if (!email) {
      res.status(404).json({ error: 'Email not found' });
      return;
    }

    res.json({ email });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch email' });
  }
});

export default router;
