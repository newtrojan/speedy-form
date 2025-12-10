/**
 * Messages tab component for quote detail panel
 *
 * Displays conversation history and reply composer for a selected quote.
 */

import type { QuoteDetail, Channel } from '../types';
import { ConversationThread } from './ConversationThread';
import { ReplyComposer } from './ReplyComposer';
import {
  useQuoteConversations,
  useQuoteMessages,
  useSendQuoteMessage,
} from '../hooks/useDashboard';
import { getAppUrl } from '@/lib/env';

interface MessagesTabProps {
  quote: QuoteDetail;
}

export function MessagesTab({ quote }: MessagesTabProps) {
  // Fetch conversations and lead score for this quote
  const { data: conversationsData, isLoading: isLoadingConversations } =
    useQuoteConversations(quote.id);

  // Get all messages from all conversations (omnichannel view)
  const { data: messagesData, isLoading: isLoadingMessages } = useQuoteMessages(quote.id);

  // Send message mutation
  const sendMessageMutation = useSendQuoteMessage();

  // Determine the default channel from the most recent conversation
  const firstConversation = conversationsData?.conversations?.[0];
  const defaultChannel: Channel = firstConversation?.channel ?? 'chat';

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleSendMessage = (content: string, channel: Channel, _isPrivate: boolean) => {
    // TODO: Add isPrivate support when backend supports private notes
    sendMessageMutation.mutate({
      quoteId: quote.id,
      content,
      includeQuoteLink: false,
      channel,
    });
  };

  // Generate the quote link using the app URL from environment
  const quoteLink = `${getAppUrl()}/quotes/${quote.id}/preview`;

  // Prepare quote data for templates
  const quoteData: {
    customerName: string | undefined;
    total: string | undefined;
    quoteId: string | undefined;
  } = {
    customerName: quote.customer.full_name.split(' ')[0] ?? undefined,
    total: quote.pricing.total ?? undefined,
    quoteId: quote.id ?? undefined,
  };

  const isLoading = isLoadingConversations || isLoadingMessages;
  const messages = messagesData?.messages ?? [];

  return (
    <div className="h-full flex flex-col">
      {/* Quote context card */}
      <div className="bg-blue-50 border-b border-blue-100 p-4 mx-8 mt-6 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">
              {quote.service.type === 'mobile' ? 'Mobile' : 'In-Store'} • $
              {quote.pricing.total}
            </p>
            <p className="text-xs text-gray-600">
              {quote.vehicle.year} {quote.vehicle.make} {quote.vehicle.model}
            </p>
          </div>

          {/* Hot lead badge */}
          {conversationsData?.lead_score?.is_hot && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z"
                  clipRule="evenodd"
                />
              </svg>
              Hot Lead
            </span>
          )}

          {/* New messages indicator */}
          {conversationsData?.lead_score?.has_new_messages && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
              {conversationsData.lead_score.new_message_count} new
            </span>
          )}
        </div>

        {/* Customer contact info */}
        <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <svg
              className="w-3 h-3"
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
            {quote.customer.email}
          </span>
          <span className="flex items-center gap-1">
            <svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
              />
            </svg>
            {quote.customer.phone}
          </span>
        </div>
      </div>

      {/* Chatwoot not configured message */}
      {!isLoading && !conversationsData?.conversations?.length && (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <svg
              className="w-8 h-8 text-gray-400"
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
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">
            No conversations yet
          </h3>
          <p className="text-sm text-gray-500 max-w-sm">
            Conversations will appear here once Chatwoot is configured and customers
            start messaging.
          </p>
        </div>
      )}

      {/* Message thread */}
      {(isLoading || messages.length > 0) && (
        <ConversationThread messages={messages} isLoading={isLoading} />
      )}

      {/* Reply composer */}
      <ReplyComposer
        onSend={handleSendMessage}
        isSending={sendMessageMutation.isPending}
        quoteData={quoteData}
        quoteLink={quoteLink}
        defaultChannel={defaultChannel}
      />
    </div>
  );
}
