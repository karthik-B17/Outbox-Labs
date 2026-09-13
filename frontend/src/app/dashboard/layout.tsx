'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { EmailCounts } from '@/types';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [counts, setCounts] = useState<EmailCounts>({ scheduled: 0, sent: 0 });
  const [showCompose, setShowCompose] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchCounts();
      // Poll for updates every 10 seconds
      const interval = setInterval(fetchCounts, 10000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchCounts = async () => {
    try {
      const data = await api.getEmailCounts();
      setCounts(data);
    } catch (error) {
      console.error('Failed to fetch counts:', error);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex">
        <Sidebar
          scheduledCount={counts.scheduled}
          sentCount={counts.sent}
          onCompose={() => router.push('/dashboard/compose')}
        />
        <main className="flex-1 bg-white min-h-[calc(100vh-64px)]">
          {children}
        </main>
      </div>
    </div>
  );
}
