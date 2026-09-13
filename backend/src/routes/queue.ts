import { Router, Response } from 'express';
import { emailQueue } from '../services/scheduler';
import { AuthRequest, authenticate } from '../middleware/auth';

const router = Router();

// Get queue stats
router.get('/stats', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      emailQueue.getWaitingCount(),
      emailQueue.getActiveCount(),
      emailQueue.getCompletedCount(),
      emailQueue.getFailedCount(),
      emailQueue.getDelayedCount(),
    ]);

    res.json({
      waiting,
      active,
      completed,
      failed,
      delayed,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch queue stats' });
  }
});

// Get recent jobs
router.get('/jobs', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { status = 'waiting', start = 0, end = 50 } = req.query;

    const startNum = parseInt(start as string);
    const endNum = parseInt(end as string);

    let jobs;
    switch (status) {
      case 'active':
        jobs = await emailQueue.getActive(startNum, endNum);
        break;
      case 'completed':
        jobs = await emailQueue.getCompleted(startNum, endNum);
        break;
      case 'failed':
        jobs = await emailQueue.getFailed(startNum, endNum);
        break;
      case 'delayed':
        jobs = await emailQueue.getDelayed(startNum, endNum);
        break;
      default:
        jobs = await emailQueue.getWaiting(startNum, endNum);
    }

    const jobData = jobs.map((job) => ({
      id: job.id,
      data: job.data,
      progress: job.progress,
      timestamp: job.timestamp,
      attemptsMade: job.attemptsMade,
      failedReason: job.failedReason,
    }));

    res.json({ jobs: jobData });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

export default router;
