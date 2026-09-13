'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { FiArrowLeft, FiPaperclip, FiClock, FiUpload } from 'react-icons/fi';

export default function ComposePage() {
  const router = useRouter();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [recipients, setRecipients] = useState<string[]>([]);
  const [recipientInput, setRecipientInput] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [delayBetween, setDelayBetween] = useState(2);
  const [hourlyLimit, setHourlyLimit] = useState(50);
  const [scheduledAt, setScheduledAt] = useState('');
  const [showSendLater, setShowSendLater] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAddRecipient = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && recipientInput.trim()) {
      e.preventDefault();
      const email = recipientInput.trim();
      if (email.includes('@') && !recipients.includes(email)) {
        setRecipients([...recipients, email]);
        setRecipientInput('');
      }
    }
  };

  const handleRemoveRecipient = (email: string) => {
    setRecipients(recipients.filter((r) => r !== email));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await api.parseCsv(file);
      const newEmails = result.emails.filter((email: string) => !recipients.includes(email));
      setRecipients([...recipients, ...newEmails]);
      toast.success(`${result.count} emails loaded from CSV`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to parse CSV');
    }
  };

  const handleSchedule = async () => {
    if (recipients.length === 0) {
      toast.error('Please add at least one recipient');
      return;
    }

    if (!subject.trim()) {
      toast.error('Please enter a subject');
      return;
    }

    if (!scheduledAt) {
      toast.error('Please select a send time');
      return;
    }

    setLoading(true);
    try {
      await api.scheduleEmail({
        recipients,
        subject,
        body,
        scheduledAt: new Date(scheduledAt).toISOString(),
        delayBetween,
        hourlyLimit,
      });

      toast.success(`${recipients.length} email(s) scheduled successfully!`);
      router.push('/dashboard/scheduled');
    } catch (error: any) {
      toast.error(error.message || 'Failed to schedule emails');
    } finally {
      setLoading(false);
    }
  };

  const quickTimes = [
    { label: 'Tomorrow', value: () => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(9, 0, 0, 0);
      return d.toISOString().slice(0, 16);
    }},
    { label: 'Tomorrow, 10:00 AM', value: () => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(10, 0, 0, 0);
      return d.toISOString().slice(0, 16);
    }},
    { label: 'Tomorrow, 11:00 AM', value: () => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(11, 0, 0, 0);
      return d.toISOString().slice(0, 16);
    }},
    { label: 'Tomorrow, 3:00 PM', value: () => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(15, 0, 0, 0);
      return d.toISOString().slice(0, 16);
    }},
  ];

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
          <h1 className="text-lg font-medium text-gray-900">Compose New Email</h1>
        </div>

        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <FiPaperclip className="w-5 h-5 text-gray-500" />
          </button>
          <button
            onClick={() => setShowSendLater(!showSendLater)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative"
          >
            <FiClock className="w-5 h-5 text-gray-500" />
          </button>
          <button
            onClick={handleSchedule}
            disabled={loading}
            className="btn-outline px-6 py-2"
          >
            {loading ? 'Scheduling...' : 'Send Later'}
          </button>
        </div>
      </div>

      {/* Send Later Popup */}
      {showSendLater && (
        <div className="absolute right-8 top-16 bg-white rounded-xl shadow-lg border border-gray-100 p-4 w-72 z-50">
          <h3 className="font-medium text-gray-900 mb-3">Send Later</h3>
          
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="input-field mb-3"
          />

          <div className="space-y-2">
            {quickTimes.map((qt) => (
              <button
                key={qt.label}
                onClick={() => {
                  setScheduledAt(qt.value());
                  setShowSendLater(false);
                }}
                className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
              >
                {qt.label}
              </button>
            ))}
          </div>

          <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-gray-100">
            <button
              onClick={() => setShowSendLater(false)}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={() => setShowSendLater(false)}
              className="btn-primary px-4 py-2 text-sm"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Form */}
      <div className="max-w-4xl mx-auto p-6">
        {/* From */}
        <div className="flex items-center gap-4 mb-4">
          <label className="w-16 text-sm text-gray-500">From</label>
          <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg border border-gray-200">
            <span className="text-gray-700">{user?.email}</span>
            <FiClock className="w-4 h-4 text-gray-400" />
          </div>
        </div>

        {/* To */}
        <div className="flex items-start gap-4 mb-4">
          <label className="w-16 text-sm text-gray-500 pt-2">To</label>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 p-2 border border-gray-200 rounded-lg bg-gray-50 min-h-[42px]">
              {recipients.map((email) => (
                <span
                  key={email}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-full text-sm"
                >
                  {email}
                  <button
                    onClick={() => handleRemoveRecipient(email)}
                    className="hover:text-primary-dark"
                  >
                    ×
                  </button>
                </span>
              ))}
              {recipients.length > 3 && (
                <span className="text-sm text-gray-500">+{recipients.length - 3}</span>
              )}
              <input
                type="email"
                value={recipientInput}
                onChange={(e) => setRecipientInput(e.target.value)}
                onKeyDown={handleAddRecipient}
                placeholder={recipients.length === 0 ? 'recipient@example.com' : ''}
                className="flex-1 min-w-[200px] bg-transparent outline-none text-sm"
              />
            </div>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 text-primary hover:text-primary-dark text-sm font-medium"
          >
            <FiUpload className="w-4 h-4" />
            Upload List
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>

        {/* Subject */}
        <div className="flex items-center gap-4 mb-4">
          <label className="w-16 text-sm text-gray-500">Subject</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject"
            className="flex-1 input-field"
          />
        </div>

        {/* Delay & Hourly Limit */}
        <div className="flex items-center gap-6 mb-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500">Delay between 2 emails</label>
            <input
              type="number"
              value={delayBetween}
              onChange={(e) => setDelayBetween(parseInt(e.target.value) || 0)}
              min="0"
              className="w-20 input-field text-center"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500">Hourly Limit</label>
            <input
              type="number"
              value={hourlyLimit}
              onChange={(e) => setHourlyLimit(parseInt(e.target.value) || 0)}
              min="1"
              className="w-20 input-field text-center"
            />
          </div>
        </div>

        {/* Body Editor */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="p-4 min-h-[300px] bg-gray-50">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Type Your Reply..."
              className="w-full h-full min-h-[280px] bg-transparent outline-none resize-none"
            />
          </div>
          
          {/* Toolbar */}
          <div className="flex items-center gap-1 px-4 py-2 border-t border-gray-200 bg-white">
            <button className="p-2 hover:bg-gray-100 rounded text-gray-500">
              <span className="font-bold">B</span>
            </button>
            <button className="p-2 hover:bg-gray-100 rounded text-gray-500">
              <span className="italic">I</span>
            </button>
            <button className="p-2 hover:bg-gray-100 rounded text-gray-500">
              <span className="underline">U</span>
            </button>
            <div className="w-px h-5 bg-gray-200 mx-1"></div>
            <button className="p-2 hover:bg-gray-100 rounded text-gray-500">
              ≡
            </button>
            <button className="p-2 hover:bg-gray-100 rounded text-gray-500">
              ≢
            </button>
          </div>
        </div>

        {/* Schedule Button */}
        <div className="flex justify-end mt-6">
          <button
            onClick={handleSchedule}
            disabled={loading}
            className="btn-primary px-8 py-3 text-base"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Scheduling...
              </div>
            ) : (
              'Schedule'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
