import prisma from '../config/database';

export class SlackService {
  static async notifyRateLimit(
    userId: string,
    sender: string,
    limit: number,
    resetAt: Date
  ): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user?.slackWebhook) {
        console.log('Slack not connected for user:', userId);
        return;
      }

      const message = {
        text: `⚠️ Rate Limit Alert`,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: '⚠️ Email Rate Limit Reached',
            },
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*Sender:*\n${sender}`,
              },
              {
                type: 'mrkdwn',
                text: `*Limit:*\n${limit} emails/hour`,
              },
              {
                type: 'mrkdwn',
                text: `*Resets at:*\n${resetAt.toLocaleString()}`,
              },
            ],
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: 'Jobs will be automatically rescheduled to the next available hour window.',
              },
            ],
          },
        ],
      };

      const response = await fetch(user.slackWebhook, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        console.error('Slack notification failed:', response.statusText);
      } else {
        console.log('Slack notification sent for rate limit');
      }
    } catch (error) {
      console.error('Slack notification error:', error);
    }
  }

  static async sendTestMessage(webhookUrl: string): Promise<boolean> {
    try {
      const message = {
        text: '✅ Email Scheduler connected successfully!',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '✅ *Email Scheduler connected successfully!*\n\nYou will receive notifications when rate limits are hit.',
            },
          },
        ],
      };

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      return response.ok;
    } catch (error) {
      console.error('Slack test message failed:', error);
      return false;
    }
  }
}
