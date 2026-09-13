'use client';

import { Email } from '@/types';
import { format } from 'date-fns';
import { FiClock, FiCheck, FiX, FiStar } from 'react-icons/fi';
import Link from 'next/link';

interface EmailListProps {
  emails: Email[];
  loading: boolean;
  type: 'scheduled' | 'sent';
}

export default function EmailList({ emails, loading, type }: EmailListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          {type === 'scheduled' ? (
            <FiClock className="w-8 h-8 text-gray-400" />
          ) : (
            <FiSend className="w-8 h-8 text-gray-400" />
          )}
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">
          No {type} emails
        </h3>
        <p className="text-gray-500">
          {type === 'scheduled'
            ? 'You have no scheduled emails yet.'
            : 'No emails have been sent yet.'}
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {emails.map((email) => (
        <Link
          key={email.id}
          href={`/dashboard/${type}/${email.id}`}
          className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
        >
          {/* Recipient */}
          <div className="flex-1 min-w-0">
            <p className="text-gray-600 truncate">To: {email.to}</p>
          </div>

          {/* Status Badge */}
          <div className="flex-shrink-0">
            {type === 'scheduled' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 text-orange-600 text-sm font-medium">
                <FiClock className="w-3.5 h-3.5" />
                {email.scheduledAt
                  ? format(new Date(email.scheduledAt), 'EEE h:mm a')
                  : 'Scheduled'}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-sm font-medium">
                <FiCheck className="w-3.5 h-3.5" />
                Sent
              </span>
            )}
          </div>

          {/* Subject & Preview */}
          <div className="flex-1 min-w-0">
            <p className="text-gray-900 font-medium truncate">{email.subject}</p>
            <p className="text-gray-500 text-sm truncate">- {email.body.substring(0, 50)}...</p>
          </div>

          {/* Star */}
          <button className="flex-shrink-0 p-1 text-gray-300 hover:text-yellow-400 transition-colors">
            <FiStar className="w-5 h-5" />
          </button>
        </Link>
      ))}
    </div>
  );
}

function FiSend(props: { className?: string }) {
  return (
    <svg
      className={props.className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}
