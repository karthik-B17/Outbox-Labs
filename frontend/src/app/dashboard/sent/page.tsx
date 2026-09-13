'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Email } from '@/types';
import EmailList from '@/components/EmailList';
import toast from 'react-hot-toast';

export default function SentPage() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSentEmails();
  }, []);

  const fetchSentEmails = async () => {
    try {
      setLoading(true);
      const { emails } = await api.getEmails({ status: 'SENT' });
      setEmails(emails);
    } catch (error: any) {
      toast.error('Failed to load sent emails');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <EmailList emails={emails} loading={loading} type="sent" />
    </div>
  );
}
