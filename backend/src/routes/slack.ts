import { Router, Response } from "express";
import prisma from "../config/database";
import { AuthRequest, authenticate } from "../middleware/auth";
import { SlackService } from "../services/slackService";

const router = Router();

router.post(
  "/connect",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const { webhookUrl } = req.body;
      const userId = req.userId!;

      if (!webhookUrl) {
        res.status(400).json({ error: "Webhook URL is required" });
        return;
      }

      // Test the webhook
      const isValid = await SlackService.sendTestMessage(webhookUrl);

      if (!isValid) {
        res.status(400).json({ error: "Invalid webhook URL" });
        return;
      }

      await prisma.user.update({
        where: { id: userId },
        data: { slackWebhook: webhookUrl },
      });

      res.json({ message: "Slack connected successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to connect Slack" });
    }
  },
);

// Disconnect Slack
router.post(
  "/disconnect",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;

      await prisma.user.update({
        where: { id: userId },
        data: { slackWebhook: null },
      });

      res.json({ message: "Slack disconnected" });
    } catch (error) {
      res.status(500).json({ error: "Failed to disconnect Slack" });
    }
  },
);

router.get("/status", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { slackWebhook: true },
    });

    res.json({
      connected: !!user?.slackWebhook,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to check Slack status" });
  }
});

export default router;
