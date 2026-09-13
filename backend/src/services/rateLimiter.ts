import { redis } from '../config/redis';
import { config } from '../config';

export class RateLimiter {
  private static getKey(sender: string, hourWindow: string): string {
    return `rate_limit:${sender}:${hourWindow}`;
  }

  private static getHourWindow(date: Date = new Date()): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    return `${year}-${month}-${day}-${hour}`;
  }

  static async canSend(sender: string): Promise<{
    allowed: boolean;
    remaining: number;
    resetAt: Date;
  }> {
    const hourWindow = this.getHourWindow();
    const key = this.getKey(sender, hourWindow);

    const count = await redis.get(key);
    const currentCount = count ? parseInt(count) : 0;

    const limit = config.rateLimit.maxPerSenderPerHour;
    const remaining = Math.max(0, limit - currentCount);

    // Calculate when this hour window resets
    const now = new Date();
    const resetAt = new Date(now);
    resetAt.setHours(resetAt.getHours() + 1, 0, 0, 0);

    return {
      allowed: currentCount < limit,
      remaining,
      resetAt,
    };
  }

  static async increment(sender: string): Promise<number> {
    const hourWindow = this.getHourWindow();
    const key = this.getKey(sender, hourWindow);

    const count = await redis.incr(key);

    // Set expiry to 2 hours (safety buffer)
    await redis.expire(key, 7200);

    return count;
  }

  static async getCount(sender: string): Promise<number> {
    const hourWindow = this.getHourWindow();
    const key = this.getKey(sender, hourWindow);

    const count = await redis.get(key);
    return count ? parseInt(count) : 0;
  }

  static async rescheduleToNextHour(sender: string): Promise<Date> {
    const hourWindow = this.getHourWindow();
    const [year, month, day, hour] = hourWindow.split('-').map(Number);

    const nextHour = new Date(year, month - 1, day, hour + 1, 0, 0, 0);
    return nextHour;
  }
}
