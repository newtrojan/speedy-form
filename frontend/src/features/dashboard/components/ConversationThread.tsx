/**
 * Conversation thread component displaying messages
 */

import { useRef, useEffect } from 'react';
import type { Message, Channel } from '../types';
import { ChannelIcon } from './ChannelIcon';

/**
 * Get channel display name
 */
function getChannelLabel(channel: Channel): string {
  switch (channel) {
    case 'sms':
      return 'SMS';
    case 'email':
      return 'Email';
    case 'chat':
      return 'Chat';
    default:
      return 'Chat';
  }
}

interface ConversationThreadProps {
  messages: Message[];
  isLoading?: boolean;
}

/**
 * Format relative time from ISO timestamp
 */
function formatTimeAgo(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function ConversationThread({ messages, isLoading }: ConversationThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
        <svg
          className="w-12 h-12 text-gray-300 mb-3"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
        <p className="text-gray-500 text-sm">No messages yet</p>
        <p className="text-gray-400 text-xs mt-1">
          Start a conversation with the customer using the reply box below
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-4">
      {messages.map((message) => {
        const isOutgoing = message.message_type === 'outgoing';
        const isPrivate = message.private;

        return (
          <div
            key={message.id}
            className={`flex gap-3 ${isOutgoing ? 'flex-row-reverse' : ''}`}
          >
            {/* Channel icon */}
            <div className="flex-shrink-0">
              <ChannelIcon channel={message.channel} />
            </div>

            {/* Message bubble */}
            <div
              className={`flex-1 max-w-[70%] ${
                isOutgoing ? 'items-end' : 'items-start'
              }`}
            >
              {/* Private note indicator */}
              {isPrivate && (
                <div className="flex items-center gap-1 text-xs text-amber-600 mb-1 px-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Internal note
                </div>
              )}

              {/* Message content */}
              <div
                className={`rounded-lg p-3 ${
                  isPrivate
                    ? 'bg-amber-50 border border-amber-200'
                    : isOutgoing
                      ? 'bg-[#DC2626] text-white'
                      : 'bg-white border border-gray-200'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>

                {/* Attachments */}
                {message.attachments && message.attachments.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {message.attachments.map((attachment, idx) => (
                      <a
                        key={idx}
                        href={attachment.data_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center gap-2 text-xs ${
                          isOutgoing && !isPrivate
                            ? 'text-white/80 hover:text-white'
                            : 'text-blue-600 hover:text-blue-700'
                        }`}
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                          />
                        </svg>
                        {attachment.file_name ?? 'Attachment'}
                      </a>
                    ))}
                  </div>
                )}
              </div>

              {/* Metadata */}
              <div className="flex items-center gap-2 mt-1 px-1">
                <p className="text-xs text-gray-500">
                  {isOutgoing && message.sender.name && `${message.sender.name} • `}
                  {formatTimeAgo(message.created_at)}
                  {' • '}
                  {getChannelLabel(message.channel)}
                </p>
                {/* Read receipt for outgoing messages */}
                {isOutgoing && !isPrivate && (
                  <svg
                    className="w-3 h-3 text-green-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
