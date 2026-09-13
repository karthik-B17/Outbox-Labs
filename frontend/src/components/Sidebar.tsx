'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter, usePathname } from 'next/navigation';
import { FiClock, FiSend, FiSettings } from 'react-icons/fi';

interface SidebarProps {
  scheduledCount: number;
  sentCount: number;
  onCompose: () => void;
}

export default function Sidebar({ scheduledCount, sentCount, onCompose }: SidebarProps) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const menuItems = [
    {
      label: 'Scheduled',
      icon: FiClock,
      count: scheduledCount,
      path: '/dashboard/scheduled',
    },
    {
      label: 'Sent',
      icon: FiSend,
      count: sentCount,
      path: '/dashboard/sent',
    },
  ];

  return (
    <div className="w-64 bg-sidebar border-r border-gray-200 h-screen flex flex-col">
      {/* User Info */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt={user.name || 'User'}
              className="w-10 h-10 rounded-full"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-medium">
              {user?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 truncate">
              {user?.name || 'User'}
            </p>
            <p className="text-sm text-gray-500 truncate">
              {user?.email}
            </p>
          </div>
        </div>
      </div>

      {/* Compose Button */}
      <div className="p-4">
        <button
          onClick={onCompose}
          className="w-full btn-outline py-2.5 font-medium"
        >
          Compose
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3">
        <p className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Core
        </p>
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const isActive = pathname === item.path;
            const Icon = item.icon;

            return (
              <li key={item.path}>
                <button
                  onClick={() => router.push(item.path)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="flex-1 text-left">{item.label}</span>
                  <span className={`text-sm ${isActive ? 'text-primary' : 'text-gray-400'}`}>
                    {item.count}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
