export interface User {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  slackWebhook?: string | null;
}

export interface Email {
  id: string;
  userId: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  status: 'DRAFT' | 'SCHEDULED' | 'SENDING' | 'SENT' | 'FAILED';
  scheduledAt: string | null;
  sentAt: string | null;
  jobId: string | null;
  hourlyLimit: number | null;
  delayBetween: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface EmailCounts {
  scheduled: number;
  sent: number;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface EmailsResponse {
  emails: Email[];
  pagination: Pagination;
}

export interface ScheduleEmailRequest {
  recipients: string[];
  subject: string;
  body: string;
  scheduledAt: string;
  delayBetween: number;
  hourlyLimit: number;
}

export interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}
