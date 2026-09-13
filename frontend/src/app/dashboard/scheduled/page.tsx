'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Email } from '@/types';
import EmailList from '@/components/EmailList';
import toast from 'react-hot-toast';

export default function ScheduledPage() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchScheduledEmails();
  }, []);

  const fetchScheduledEmails = async () => {
    try {
      setLoading(true);
      const { emails } = await api.getEmails({ status: 'SCHEDULED' });
      setEmails(emails);
    } catch (error: any) {
      toast.error('Failed to load scheduled emails');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <EmailList emails={emails} loading={loading} type="scheduled" />
    </div>
  );
}
