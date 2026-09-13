'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Email } from '@/types';
import { format } from 'date-fns';
import { FiArrowLeft, FiClock, FiCheck, FiX, FiStar, FiMail, FiUser, FiCalendar } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function EmailDetailPage() {
  const router = useRouter();
  const params = useParams();
  const type = params.type as 'scheduled' | 'sent';
  const id = params.id as string;

  const [email, setEmail] = useState<Email | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmail();
  }, [id]);

  const fetchEmail = async () => {
    try {
      setLoading(true);
      const { email } = await api.getEmail(id);
      setEmail(email);
    } catch (error: any) {
      toast.error('Failed to load email');
      router.push(`/dashboard/${type}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!email) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-500">Email not found</p>
      </div>
    );
  }

  const getStatusColor = () => {
    switch (email.status) {
      case 'SCHEDULED': return 'bg-orange-50 text-orange-600';
      case 'SENT': return 'bg-green-50 text-green-600';
      case 'FAILED': return 'bg-red-50 text-red-600';
      case 'SENDING': return 'bg-blue-50 text-blue-600';
      default: return 'bg-gray-50 text-gray-600';
    }
  };

  const getStatusIcon = () => {
    switch (email.status) {
      case 'SCHEDULED': return <FiClock className="w-4 h-4" />;
      case 'SENT': return <FiCheck className="w-4 h-4" />;
      case 'FAILED': return <FiX className="w-4 h-4" />;
      case 'SENDING': return <FiClock className="w-4 h-4 animate-spin" />;
      default: return <FiMail className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="h-14 border-b border-gray-200 flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <FiArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-lg font-medium text-gray-900">Email Details</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-6">
        {/* Status Badge */}
        <div className="mb-6">
          <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor()}`}>
            {getStatusIcon()}
            {email.status}
          </span>
        </div>

        {/* Email Fields */}
        <div className="space-y-4">
          {/* From */}
          <div className="bg-gray-50 rounded-lg p-4">
            <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1 block">From</label>
            <div className="flex items-center gap-2">
              <FiUser className="w-5 h-5 text-gray-400" />
              <span className="text-gray-900 font-medium">{email.from}</span>
            </div>
          </div>

          {/* To */}
          <div className="bg-gray-50 rounded-lg p-4">
            <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1 block">To</label>
            <div className="flex items-center gap-2">
              <FiMail className="w-5 h-5 text-gray-400" />
              <span className="text-gray-900 font-medium">{email.to}</span>
            </div>
          </div>

          {/* Subject */}
          <div className="bg-gray-50 rounded-lg p-4">
            <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1 block">Subject</label>
            <p className="text-gray-900 font-medium">{email.subject}</p>
          </div>

          {/* Body */}
          <div className="bg-gray-50 rounded-lg p-4">
            <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 block">Body</label>
            <div className="prose max-w-none text-gray-900 whitespace-pre-wrap">
              {email.body}
            </div>
          </div>

          {/* Timestamps */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
            <div className="bg-gray-50 rounded-lg p-4">
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1 block">Created At</label>
              <div className="flex items-center gap-2">
                <FiCalendar className="w-5 h-5 text-gray-400" />
                <span className="text-gray-900">{format(new Date(email.createdAt), 'MMM d, yyyy h:mm a')}</span>
              </div>
            </div>

            {type === 'scheduled' ? (
              <div className="bg-gray-50 rounded-lg p-4">
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1 block">Scheduled For</label>
                <div className="flex items-center gap-2">
                  <FiClock className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-900">{email.scheduledAt ? format(new Date(email.scheduledAt), 'MMM d, yyyy h:mm a') : 'Not scheduled'}</span>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-4">
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1 block">Sent At</label>
                <div className="flex items-center gap-2">
                  <FiCheck className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-900">{email.sentAt ? format(new Date(email.sentAt), 'MMM d, yyyy h:mm a') : 'Unknown'}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        {type === 'scheduled' && email.status === 'SCHEDULED' && (
          <div className="mt-6 pt-4 border-t border-gray-100">
            <button
              onClick={async () => {
                try {
                  await api.cancelEmail(id);
                  toast.success('Email cancelled');
                  router.push('/dashboard/scheduled');
                } catch (error: any) {
                  toast.error('Failed to cancel email');
                }
              }}
              className="w-full btn-outline py-2.5"
            >
              Cancel Scheduled Email
            </button>
          </div>
        )}
      </div>
    </div>
  );
}