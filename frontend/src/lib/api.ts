import { User, Email, EmailCounts, EmailsResponse, ScheduleEmailRequest, QueueStats } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }

  getToken(): string | null {
    if (this.token) return this.token;
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('token');
    }
    return this.token;
  }

  private async fetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    };

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  }

  // Auth
  async login(email: string, password: string) {
    return this.fetch<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async register(email: string, password: string, name: string) {
    return this.fetch<{ token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
  }

  async getMe() {
    return this.fetch<{ user: User }>('/auth/me');
  }

  // Emails
  async getEmails(params: { status?: string; page?: number; search?: string } = {}) {
    const searchParams = new URLSearchParams();
    if (params.status) searchParams.set('status', params.status);
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.search) searchParams.set('search', params.search);
    
    const query = searchParams.toString();
    return this.fetch<EmailsResponse>(`/api/emails${query ? `?${query}` : ''}`);
  }

  async getEmailCounts() {
    return this.fetch<EmailCounts>('/api/emails/counts');
  }

  async scheduleEmail(data: ScheduleEmailRequest) {
    return this.fetch<{ message: string; emails: Email[] }>('/api/emails/schedule', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteEmail(id: string) {
    return this.fetch<{ message: string }>(`/api/emails/${id}`, {
      method: 'DELETE',
    });
  }

  async getEmail(id: string) {
    return this.fetch<{ email: Email }>(`/api/emails/${id}`);
  }

  async cancelEmail(id: string) {
    return this.fetch<{ message: string }>(`/api/emails/${id}`, {
      method: 'DELETE',
    });
  }

  async parseCsv(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const token = this.getToken();
    const response = await fetch(`${API_URL}/api/emails/parse-csv`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Parse failed' }));
      throw new Error(error.error || 'Parse failed');
    }

    return response.json();
  }

  // Queue
  async getQueueStats() {
    return this.fetch<QueueStats>('/api/queue/stats');
  }

  // Slack
  async connectSlack(webhookUrl: string) {
    return this.fetch<{ message: string }>('/api/slack/connect', {
      method: 'POST',
      body: JSON.stringify({ webhookUrl }),
    });
  }

  async disconnectSlack() {
    return this.fetch<{ message: string }>('/api/slack/disconnect', {
      method: 'POST',
    });
  }

  async getSlackStatus() {
    return this.fetch<{ connected: boolean }>('/api/slack/status');
  }
}

export const api = new ApiClient();
