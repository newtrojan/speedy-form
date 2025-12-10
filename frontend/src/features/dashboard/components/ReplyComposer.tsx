/**
 * Reply composer component with channel selector and message input
 */

import { useState, useRef, useEffect } from 'react';
import type { Channel } from '../types';
import { ChannelIcon } from './ChannelIcon';
import { TemplatesPicker } from './TemplatesPicker';

interface QuoteData {
  customerName?: string | undefined;
  total?: string | undefined;
  quoteId?: string | undefined;
}

interface ReplyComposerProps {
  onSend: (content: string, channel: Channel, isPrivate: boolean) => void;
  isSending?: boolean | undefined;
  quoteData?: QuoteData | undefined;
  quoteLink?: string | undefined;
  defaultChannel?: Channel | undefined;
}

export function ReplyComposer({
  onSend,
  isSending = false,
  quoteData,
  quoteLink,
  defaultChannel = 'chat',
}: ReplyComposerProps) {
  const [message, setMessage] = useState('');
  const [channel, setChannel] = useState<Channel>(defaultChannel);
  const [isPrivate, setIsPrivate] = useState(false);
  const [showChannelDropdown, setShowChannelDropdown] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const channelDropdownRef = useRef<HTMLDivElement>(null);

  // SMS character limit
  const SMS_LIMIT = 160;
  const isOverLimit = channel === 'sms' && message.length > SMS_LIMIT;

  // Update channel when defaultChannel changes (e.g., switching quotes)
  useEffect(() => {
    setChannel(defaultChannel);
  }, [defaultChannel]);

  // Close channel dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        channelDropdownRef.current &&
        !channelDropdownRef.current.contains(event.target as Node)
      ) {
        setShowChannelDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Check if send is allowed (SMS must be under limit)
  const canSend = !isSending && message.trim() && !isOverLimit;

  const handleSubmit = () => {
    if (!canSend) return;
    onSend(message.trim(), channel, isPrivate);
    setMessage('');
    setIsPrivate(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Cmd/Ctrl + Enter to send
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleTemplateSelect = (content: string) => {
    setMessage(content);
    textareaRef.current?.focus();
  };

  const handleInsertQuoteLink = () => {
    if (!quoteLink) return;

    // Insert the quote link at cursor position or append to message
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const linkText = `\n\nView your quote: ${quoteLink}`;

      const newMessage =
        message.slice(0, start) + linkText + message.slice(end);
      setMessage(newMessage);

      // Move cursor after the inserted link
      setTimeout(() => {
        textarea.focus();
        const newPos = start + linkText.length;
        textarea.setSelectionRange(newPos, newPos);
      }, 0);
    } else {
      // Fallback: just append to message
      setMessage((prev) => `${prev}\n\nView your quote: ${quoteLink}`);
    }
  };

  const channelOptions: { value: Channel; label: string }[] = [
    { value: 'sms', label: 'SMS' },
    { value: 'email', label: 'Email' },
    { value: 'chat', label: 'Web Chat' },
  ];

  return (
    <div className="border-t border-gray-200 bg-white p-6">
      <div className="max-w-4xl mx-auto space-y-3">
        {/* Channel selector and templates */}
        <div className="flex items-center gap-3">
          {/* Channel dropdown */}
          <div className="relative" ref={channelDropdownRef}>
            <button
              type="button"
              onClick={() => setShowChannelDropdown(!showChannelDropdown)}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 min-w-[140px] justify-between"
            >
              <div className="flex items-center gap-2">
                <ChannelIcon channel={channel} size="sm" />
                <span>
                  {channelOptions.find((opt) => opt.value === channel)?.label}
                </span>
              </div>
              <svg
                className={`w-4 h-4 text-gray-400 transition-transform ${
                  showChannelDropdown ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {showChannelDropdown && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                {channelOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setChannel(option.value);
                      setShowChannelDropdown(false);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg ${
                      channel === option.value
                        ? 'bg-gray-50 text-gray-900'
                        : 'text-gray-700'
                    }`}
                  >
                    <ChannelIcon channel={option.value} size="sm" />
                    <span>{option.label}</span>
                    {channel === option.value && (
                      <svg
                        className="w-4 h-4 ml-auto text-red-600"
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
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Templates button */}
          <TemplatesPicker onSelect={handleTemplateSelect} quoteData={quoteData} />

          {/* Private note toggle */}
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="rounded border-gray-300 text-red-600 focus:ring-red-500"
            />
            Internal note
          </label>
        </div>

        {/* Textarea */}
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isPrivate
                ? 'Add an internal note (only visible to your team)...'
                : 'Type your message...'
            }
            className={`w-full min-h-[100px] p-3 text-sm border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent ${
              isPrivate ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-300'
            }`}
          />

          {/* SMS character counter */}
          {channel === 'sms' && (
            <div
              className={`absolute bottom-3 right-3 text-xs ${
                isOverLimit ? 'text-red-600 font-semibold' : 'text-gray-400'
              }`}
            >
              {message.length}/{SMS_LIMIT}
              {isOverLimit && (
                <span className="ml-1">(blocked)</span>
              )}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Quote link button */}
            {quoteLink && (
              <button
                type="button"
                onClick={handleInsertQuoteLink}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
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
                    d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                  />
                </svg>
                Insert Quote Link
              </button>
            )}

            {/* Attach file button (placeholder) */}
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
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
              Attach
            </button>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSend}
            title={isOverLimit ? 'SMS must be 160 characters or less' : undefined}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#DC2626] rounded-md hover:bg-[#B91C1C] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Sending...
              </>
            ) : (
              <>
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
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
                Send {isPrivate ? 'Note' : 'Message'}
              </>
            )}
          </button>
        </div>

        {/* Keyboard shortcut hint */}
        <p className="text-xs text-gray-400 text-right">
          Press{' '}
          <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">Cmd</kbd>+
          <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">Enter</kbd>{' '}
          to send
        </p>
      </div>
    </div>
  );
}
