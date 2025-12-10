/**
 * Unified Inbox Tab
 *
 * Shows all conversations across all customers with enriched context.
 * CSRs can see conversations regardless of whether a quote exists.
 */

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useInbox, useConversationMessages, useSendMessage } from '../hooks/useDashboard';
import { ChannelIcon } from './ChannelIcon';
import { ConversationThread } from './ConversationThread';
import { ReplyComposer } from './ReplyComposer';
import type { InboxConversation, ConversationStatus, Channel } from '../types';

type InboxFilter = ConversationStatus | 'all';

export function InboxTab() {
  const [activeFilter, setActiveFilter] = useState<InboxFilter>('open');
  const [selectedConversation, setSelectedConversation] = useState<InboxConversation | null>(null);

  // Fetch inbox conversations
  const { data: inboxData, isLoading } = useInbox(activeFilter);

  // Fetch messages for selected conversation
  const { data: messagesData, isLoading: isLoadingMessages } = useConversationMessages(
    selectedConversation?.id ?? null
  );

  // Send message mutation
  const sendMessageMutation = useSendMessage();

  const conversations = inboxData?.conversations ?? [];
  const messages = messagesData?.messages ?? [];

  const handleSendMessage = (content: string, _channel: Channel, isPrivate: boolean) => {
    if (!selectedConversation) return;
    sendMessageMutation.mutate({
      conversationId: selectedConversation.id,
      content,
      isPrivate,
    });
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = Date.now();
    const seconds = Math.floor((now - date.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const getStatusBadge = (status: ConversationStatus) => {
    switch (status) {
      case 'open':
        return <Badge variant="secondary" className="bg-green-50 text-green-700">Open</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-50 text-yellow-700">Pending</Badge>;
      case 'resolved':
        return <Badge variant="secondary" className="bg-gray-100 text-gray-600">Resolved</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-full w-full flex-1">
      {/* Conversation List */}
      <div className="w-[400px] border-r border-gray-200 bg-white flex flex-col min-h-0">
        {/* Filter Tabs */}
        <div className="px-4 py-3 border-b border-gray-200">
          <div className="flex gap-2">
            {(['open', 'pending', 'resolved', 'all'] as InboxFilter[]).map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  activeFilter === filter
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
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
              <p className="text-gray-500 text-sm">No conversations</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv)}
                  className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                    selectedConversation?.id === conv.id ? 'bg-gray-50' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Channel Icon */}
                    <div className="mt-0.5">
                      <ChannelIcon channel={conv.channel} size="sm" />
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Customer Name + Status */}
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-gray-900 truncate">
                          {conv.django_customer?.full_name || conv.contact?.name || conv.contact?.email || 'Unknown'}
                        </span>
                        {getStatusBadge(conv.status)}
                      </div>

                      {/* Last Message Preview */}
                      <p className="text-sm text-gray-600 truncate mb-1">
                        {conv.last_message?.content || 'No messages yet'}
                      </p>

                      {/* Meta Row: Time + Unread + Quotes */}
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-400">
                          {conv.updated_at ? getTimeAgo(conv.updated_at) : ''}
                        </span>
                        <div className="flex items-center gap-2">
                          {conv.unread_count > 0 && (
                            <span className="bg-red-500 text-white px-1.5 py-0.5 rounded-full text-xs font-medium">
                              {conv.unread_count}
                            </span>
                          )}
                          {conv.active_quotes && conv.active_quotes.length > 0 && (
                            <span className="text-blue-600 font-medium">
                              {conv.active_quotes.length} quote{conv.active_quotes.length > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Conversation Detail Panel */}
      <div className="flex-1 flex flex-col bg-gray-50 min-h-0 min-w-0">
        {selectedConversation ? (
          <>
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ChannelIcon channel={selectedConversation.channel} size="md" />
                  <div>
                    <h2 className="font-semibold text-gray-900">
                      {selectedConversation.django_customer?.full_name ||
                        selectedConversation.contact?.name ||
                        selectedConversation.contact?.email ||
                        'Unknown Customer'}
                    </h2>
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      {selectedConversation.django_customer?.email && (
                        <span>{selectedConversation.django_customer.email}</span>
                      )}
                      {selectedConversation.django_customer?.phone && (
                        <span>{selectedConversation.django_customer.phone}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Active Quotes */}
                {selectedConversation.active_quotes && selectedConversation.active_quotes.length > 0 && (
                  <div className="flex gap-2">
                    {selectedConversation.active_quotes.map((quote) => (
                      <Badge
                        key={quote.id}
                        variant="secondary"
                        className="bg-blue-50 text-blue-700 cursor-pointer hover:bg-blue-100"
                      >
                        Quote #{quote.id.slice(0, 8)}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Messages Thread */}
            <ConversationThread
              messages={messages}
              isLoading={isLoadingMessages}
            />

            {/* Reply Composer */}
            <ReplyComposer
              onSend={handleSendMessage}
              isSending={sendMessageMutation.isPending}
              quoteData={{}}
              quoteLink=""
              defaultChannel={selectedConversation.channel}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-center p-8">
            <div>
              <svg
                className="w-16 h-16 text-gray-300 mx-auto mb-4"
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
              <p className="text-gray-500 text-lg mb-2">Select a conversation</p>
              <p className="text-gray-400 text-sm">
                Choose a conversation from the list to view messages
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
