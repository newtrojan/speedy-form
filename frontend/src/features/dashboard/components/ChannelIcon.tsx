/**
 * Channel icon component for displaying SMS, Email, or Chat icons
 */

import type { Channel } from '../types';

interface ChannelIconProps {
  channel: Channel;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: { container: 'w-4 h-4', icon: 'w-2.5 h-2.5' },
  md: { container: 'w-5 h-5', icon: 'w-3 h-3' },
  lg: { container: 'w-6 h-6', icon: 'w-4 h-4' },
};

export function ChannelIcon({
  channel,
  size = 'md',
  className = '',
}: ChannelIconProps) {
  const { container, icon } = sizeClasses[size];

  if (channel === 'sms') {
    return (
      <div
        className={`${container} rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 ${className}`}
      >
        <svg
          className={`${icon} text-blue-600`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
          />
        </svg>
      </div>
    );
  }

  if (channel === 'email') {
    return (
      <div
        className={`${container} rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 ${className}`}
      >
        <svg
          className={`${icon} text-gray-600`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      </div>
    );
  }

  // Chat (default)
  return (
    <div
      className={`${container} rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 ${className}`}
    >
      <svg
        className={`${icon} text-green-600`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        />
      </svg>
    </div>
  );
}
