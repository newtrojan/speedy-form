import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/context/AuthContext';
import {
  useDashboardStats,
  useQuotes,
  useQuoteDetail,
  useValidateQuote,
  useRejectQuote,
  useAddNote,
  useQuoteConversations,
} from '../hooks/useDashboard';
import { PartInfoCard } from '../components/PartInfoCard';
import { MessagesTab } from '../components/MessagesTab';
import type { FilterType, QuoteListItem, QuoteFilters } from '../types';

type DetailTab = 'info' | 'messages';

export default function DashboardPage() {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DetailTab>('info');
  const [searchQuery, setSearchQuery] = useState('');
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [addNoteDialogOpen, setAddNoteDialogOpen] = useState(false);
  const [newNote, setNewNote] = useState('');

  // Ref for detail panel scroll reset
  const detailPanelRef = useRef<HTMLDivElement>(null);

  // Auth
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Build filters based on active filter
  const getFilters = (): QuoteFilters => {
    const filters: QuoteFilters = {};

    if (searchQuery) {
      filters.search = searchQuery;
    }

    switch (activeFilter) {
      case 'needs_review':
        filters.state = 'pending_validation';
        break;
      case 'hot_leads':
        filters.state = 'sent';
        filters.has_views = true;
        break;
      case 'awaiting_response':
        filters.state = 'sent';
        filters.has_views = false;
        break;
      case 'follow_up':
        filters.state = 'sent';
        filters.stale = true;
        break;
      case 'scheduled':
        filters.state = 'scheduled';
        break;
      default:
        // 'all' - no state filter, exclude terminal states
        break;
    }

    return filters;
  };

  // Queries
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const {
    data: quotesData,
    isLoading: quotesLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useQuotes(getFilters());
  const { data: selectedQuote, isLoading: quoteLoading } =
    useQuoteDetail(selectedQuoteId);
  const { data: conversationsData } = useQuoteConversations(selectedQuoteId);

  // Get unread message count for badge
  const unreadCount = conversationsData?.lead_score?.new_message_count ?? 0;

  // Flatten quotes from paginated response
  const quotes = useMemo(() => quotesData?.quotes ?? [], [quotesData]);

  // Ref for infinite scroll trigger element
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Intersection observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Scroll detail panel to top when selecting a new quote
  // Trigger on ID change (immediate) AND data change (after load)
  useEffect(() => {
    if (selectedQuoteId && detailPanelRef.current) {
      detailPanelRef.current.scrollTop = 0;
    }
  }, [selectedQuoteId]);

  useEffect(() => {
    if (selectedQuote && detailPanelRef.current) {
      detailPanelRef.current.scrollTop = 0;
    }
  }, [selectedQuote]);

  // Mutations
  const validateMutation = useValidateQuote();
  const rejectMutation = useRejectQuote();
  const addNoteMutation = useAddNote();

  const getStatusBadge = (quote: QuoteListItem) => {
    if (quote.state === 'pending_validation') {
      return (
        <Badge variant="secondary" className="bg-gray-100 text-gray-700">
          Needs Review
        </Badge>
      );
    }
    if (quote.view_count === 0 && quote.state === 'sent') {
      return (
        <Badge variant="secondary" className="bg-blue-50 text-blue-700">
          Sent
        </Badge>
      );
    }
    if (quote.view_count > 0) {
      return (
        <Badge variant="secondary" className="bg-green-50 text-green-700">
          Viewed
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="bg-gray-100 text-gray-700">
        {quote.state_display}
      </Badge>
    );
  };

  const getTimeAgo = useCallback((dateString: string) => {
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
  }, []);

  const handleSendQuote = async () => {
    if (!selectedQuoteId) return;
    try {
      await validateMutation.mutateAsync({ quoteId: selectedQuoteId });
      // Optionally show success toast
    } catch (error) {
      console.error('Failed to send quote:', error);
    }
  };

  const handleRejectQuote = async () => {
    if (!selectedQuoteId || !rejectReason) return;
    try {
      await rejectMutation.mutateAsync({
        quoteId: selectedQuoteId,
        reason: rejectReason,
      });
      setRejectDialogOpen(false);
      setRejectReason('');
      setSelectedQuoteId(null);
    } catch (error) {
      console.error('Failed to reject quote:', error);
    }
  };

  const handleAddNote = async () => {
    if (!selectedQuoteId || !newNote.trim()) return;
    try {
      await addNoteMutation.mutateAsync({
        quoteId: selectedQuoteId,
        content: newNote.trim(),
      });
      setAddNoteDialogOpen(false);
      setNewNote('');
    } catch (error) {
      console.error('Failed to add note:', error);
    }
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/">
              <img
                src="/images/fnc-speedyglass-horz-reg-logo-full-color-rgb.webp"
                alt="Speedy Glass Logo"
                className="h-12 w-auto"
              />
            </Link>
            <div className="h-6 w-px bg-gray-300" />
            <h1 className="text-lg font-semibold text-gray-900">CSR Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <Input
                placeholder="Search quotes, customers, vehicles..."
                className="pl-10 w-96 bg-gray-50 border-gray-200"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">
                {user?.first_name || user?.email || 'Staff'}
              </span>
              <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
                {user?.first_name?.[0]?.toUpperCase() ||
                  user?.email?.[0]?.toUpperCase() ||
                  'S'}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="text-gray-600 hover:text-gray-900"
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
              Quote Queue
            </h2>

            {/* Quick Stats */}
            <div className="space-y-3 mb-6">
              {statsLoading ? (
                <>
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-full" />
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Active Quotes</span>
                    <span className="font-semibold text-gray-900">
                      {(stats?.needs_review ?? 0) +
                        (stats?.hot_leads ?? 0) +
                        (stats?.awaiting_response ?? 0) +
                        (stats?.scheduled ?? 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Needs Attention</span>
                    <span className="font-semibold text-primary">
                      {(stats?.needs_review ?? 0) + (stats?.follow_up ?? 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Today Sent</span>
                    <span className="font-semibold text-gray-900">
                      {stats?.today?.sent ?? 0}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Filters */}
          <nav className="flex-1 p-4">
            <div className="space-y-1">
              <button
                onClick={() => setActiveFilter('all')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeFilter === 'all'
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <span>All Quotes</span>
                <span className="text-xs text-gray-500">
                  {statsLoading ? '-' : quotes.length}
                </span>
              </button>
              <button
                onClick={() => setActiveFilter('needs_review')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeFilter === 'needs_review'
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <span>Needs Review</span>
                <span className="text-xs text-gray-500">
                  {stats?.needs_review ?? '-'}
                </span>
              </button>
              <button
                onClick={() => setActiveFilter('hot_leads')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeFilter === 'hot_leads'
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <span>Hot Leads</span>
                <span className="text-xs text-primary">{stats?.hot_leads ?? '-'}</span>
              </button>
              <button
                onClick={() => setActiveFilter('awaiting_response')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeFilter === 'awaiting_response'
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <span>Awaiting Response</span>
                <span className="text-xs text-gray-500">
                  {stats?.awaiting_response ?? '-'}
                </span>
              </button>
              <button
                onClick={() => setActiveFilter('follow_up')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeFilter === 'follow_up'
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <span>Follow-up Needed</span>
                <span className="text-xs text-primary">{stats?.follow_up ?? '-'}</span>
              </button>
              <button
                onClick={() => setActiveFilter('scheduled')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeFilter === 'scheduled'
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <span>Scheduled</span>
                <span className="text-xs text-gray-500">{stats?.scheduled ?? '-'}</span>
              </button>
            </div>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-h-0 flex overflow-hidden">
          {/* Quote List */}
          <div className="w-[480px] border-r border-gray-200 bg-white flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">
                  {activeFilter === 'all' && 'All Quotes'}
                  {activeFilter === 'needs_review' && 'Needs Review'}
                  {activeFilter === 'hot_leads' && 'Hot Leads'}
                  {activeFilter === 'awaiting_response' && 'Awaiting Response'}
                  {activeFilter === 'follow_up' && 'Follow-up Needed'}
                  {activeFilter === 'scheduled' && 'Scheduled'}
                </h2>
                <span className="text-sm text-gray-500">{quotes.length}</span>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto">
              {quotesLoading ? (
                <div className="p-6 space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-4 w-1/4" />
                    </div>
                  ))}
                </div>
              ) : quotes.length === 0 ? (
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
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <p className="text-gray-500 text-sm">No quotes found</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {quotes.map((quote) => (
                    <button
                      key={quote.id}
                      onClick={() => {
                        setSelectedQuoteId(quote.id);
                        setActiveTab('info'); // Reset to info tab on new selection
                      }}
                      className={`w-full px-6 py-4 text-left hover:bg-gray-50 transition-colors ${
                        selectedQuoteId === quote.id ? 'bg-gray-50' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-gray-900 truncate">
                              {quote.customer_name || quote.customer_email}
                            </p>
                            {quote.is_hot && (
                              <Badge className="bg-primary text-white text-xs">
                                Hot
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 truncate">
                            {quote.vehicle_display}
                          </p>
                        </div>
                        <div className="ml-3">{getStatusBadge(quote)}</div>
                      </div>

                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-gray-600">
                          {quote.glass_type.replace('_', ' ')}
                        </p>
                        <p className="text-sm font-semibold text-gray-900">
                          ${parseFloat(quote.total_price).toFixed(2)}
                        </p>
                      </div>

                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Created {getTimeAgo(quote.created_at)}</span>
                        {quote.view_count > 0 && (
                          <div className="flex items-center gap-1">
                            <svg
                              className="w-3.5 h-3.5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                              />
                            </svg>
                            <span>{quote.view_count}x viewed</span>
                          </div>
                        )}
                        {quote.state === 'sent' && quote.view_count === 0 && (
                          <span className="text-gray-400">Not opened</span>
                        )}
                      </div>
                    </button>
                  ))}

                  {/* Infinite scroll trigger + loading indicator */}
                  <div ref={loadMoreRef} className="py-4">
                    {isFetchingNextPage && (
                      <div className="flex justify-center">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-primary" />
                      </div>
                    )}
                    {!hasNextPage && quotes.length > 0 && (
                      <p className="text-center text-xs text-gray-400">
                        All {quotesData?.totalCount ?? quotes.length} quotes loaded
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quote Detail Panel */}
          <div
            ref={detailPanelRef}
            className="flex-1 min-h-0 bg-gray-50 overflow-y-auto"
          >
            {selectedQuoteId && quoteLoading ? (
              <div className="max-w-4xl mx-auto p-8 space-y-6">
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            ) : selectedQuote ? (
              <div className="h-full flex flex-col">
                {/* Tab Switcher */}
                <div className="bg-white border-b border-gray-200 px-8 pt-6">
                  <div className="max-w-4xl mx-auto">
                    <div className="flex gap-6">
                      <button
                        onClick={() => setActiveTab('info')}
                        className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                          activeTab === 'info'
                            ? 'border-red-600 text-red-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        Quote Info
                      </button>
                      <button
                        onClick={() => setActiveTab('messages')}
                        className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                          activeTab === 'messages'
                            ? 'border-red-600 text-red-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        Messages
                        {unreadCount > 0 && (
                          <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700">
                            {unreadCount}
                          </span>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Tab Content */}
                {activeTab === 'info' ? (
                  <div className="flex-1 overflow-y-auto p-8">
                    <div className="max-w-4xl mx-auto">
                      {/* Customer & Vehicle Info */}
                      <Card className="p-6 mb-6">
                        <div className="flex items-start justify-between mb-6">
                          <div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-1">
                              {selectedQuote.customer.full_name}
                            </h2>
                            <p className="text-sm text-gray-500">
                              Quote #{selectedQuote.id.slice(0, 8)}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge
                              variant="secondary"
                              className={
                                selectedQuote.state === 'pending_validation'
                                  ? 'bg-gray-100 text-gray-700'
                                  : selectedQuote.engagement.view_count > 0
                                    ? 'bg-green-50 text-green-700'
                                    : 'bg-blue-50 text-blue-700'
                              }
                            >
                              {selectedQuote.state === 'pending_validation'
                                ? 'Needs Review'
                                : selectedQuote.engagement.view_count > 0
                                  ? 'Viewed'
                                  : 'Sent'}
                            </Badge>
                            {selectedQuote.engagement.is_hot && (
                              <Badge className="bg-primary text-white">Hot Lead</Badge>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                              Contact Information
                            </h3>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-sm">
                                <svg
                                  className="w-4 h-4 text-gray-400"
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
                                <a
                                  href={`tel:${selectedQuote.customer.phone}`}
                                  className="text-primary hover:underline"
                                >
                                  {selectedQuote.customer.phone}
                                </a>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <svg
                                  className="w-4 h-4 text-gray-400"
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
                                <a
                                  href={`mailto:${selectedQuote.customer.email}`}
                                  className="text-primary hover:underline"
                                >
                                  {selectedQuote.customer.email}
                                </a>
                              </div>
                            </div>
                          </div>

                          <div>
                            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                              Vehicle Information
                            </h3>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-sm">
                                <svg
                                  className="w-4 h-4 text-gray-400"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                                  />
                                </svg>
                                <span className="text-gray-900">
                                  {selectedQuote.vehicle.year}{' '}
                                  {selectedQuote.vehicle.make}{' '}
                                  {selectedQuote.vehicle.model}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <svg
                                  className="w-4 h-4 text-gray-400"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                                  />
                                </svg>
                                <span className="text-gray-600">
                                  {selectedQuote.glass.display_name}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Card>

                      {/* Engagement Section */}
                      {selectedQuote.state !== 'pending_validation' && (
                        <Card className="p-6 mb-6">
                          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
                            Customer Engagement
                          </h3>

                          {selectedQuote.engagement.view_count > 0 ? (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                                    <svg
                                      className="w-4 h-4 text-white"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M5 13l4 4L19 7"
                                      />
                                    </svg>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">
                                      Customer is engaged
                                    </p>
                                    <p className="text-xs text-gray-600">
                                      Viewed {selectedQuote.engagement.view_count}x
                                      {selectedQuote.engagement.last_viewed_at &&
                                        `, last viewed ${getTimeAgo(selectedQuote.engagement.last_viewed_at)}`}
                                    </p>
                                  </div>
                                </div>
                                {selectedQuote.engagement.is_hot && (
                                  <Badge className="bg-primary text-white">
                                    Hot Lead
                                  </Badge>
                                )}
                              </div>

                              {/* Timeline */}
                              <div className="space-y-2 pt-2">
                                {selectedQuote.state_history
                                  .slice()
                                  .reverse()
                                  .map((log, index) => (
                                    <div
                                      key={index}
                                      className="flex items-start gap-3 text-sm"
                                    >
                                      <div
                                        className={`w-2 h-2 rounded-full mt-1.5 ${
                                          log.to_state === 'sent'
                                            ? 'bg-blue-500'
                                            : 'bg-green-500'
                                        }`}
                                      />
                                      <div className="flex-1">
                                        <p className="text-gray-900 font-medium">
                                          {log.to_state === 'sent'
                                            ? 'Quote sent to customer'
                                            : log.to_state === 'pending_validation'
                                              ? 'Quote created'
                                              : `Status: ${log.to_state}`}
                                        </p>
                                        <p className="text-gray-500 text-xs">
                                          {new Date(log.timestamp).toLocaleString()}
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                                {selectedQuote.engagement.views.map((view, index) => (
                                  <div
                                    key={`view-${index}`}
                                    className="flex items-start gap-3 text-sm"
                                  >
                                    <div className="w-2 h-2 bg-green-500 rounded-full mt-1.5" />
                                    <div className="flex-1">
                                      <p className="text-gray-900 font-medium">
                                        Customer viewed quote ({view.device_type})
                                      </p>
                                      <p className="text-gray-500 text-xs">
                                        {new Date(view.viewed_at).toLocaleString()}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
                              <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                                <svg
                                  className="w-4 h-4 text-white"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                  />
                                </svg>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  Quote sent but not opened
                                </p>
                                <p className="text-xs text-gray-600">
                                  Sent {getTimeAgo(selectedQuote.created_at)}
                                </p>
                              </div>
                            </div>
                          )}
                        </Card>
                      )}

                      {/* Quote Details */}
                      <Card className="p-6 mb-6">
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
                          Quote Details
                        </h3>

                        <div className="space-y-3">
                          {selectedQuote.pricing.line_items.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                            >
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {item.description}
                                </p>
                                <p className="text-xs text-gray-500 capitalize">
                                  {item.type}
                                </p>
                              </div>
                              <p className="text-sm font-semibold text-gray-900">
                                ${parseFloat(item.subtotal).toFixed(2)}
                              </p>
                            </div>
                          ))}
                          <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                            <p className="text-base font-semibold text-gray-900">
                              Total
                            </p>
                            <p className="text-lg font-bold text-gray-900">
                              ${parseFloat(selectedQuote.pricing.total).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </Card>

                      {/* Part Information */}
                      {selectedQuote.part_info && (
                        <div className="mb-6">
                          <PartInfoCard partInfo={selectedQuote.part_info} />
                        </div>
                      )}

                      {/* CSR Notes */}
                      {(selectedQuote.notes?.length > 0 || selectedQuote.csr_notes) && (
                        <Card className="p-6 mb-6">
                          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
                            CSR Notes
                          </h3>
                          <div className="space-y-3">
                            {/* New structured notes */}
                            {selectedQuote.notes?.map((note) => (
                              <div
                                key={note.id}
                                className="bg-gray-50 p-3 rounded border border-gray-200"
                              >
                                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                  {note.content}
                                </p>
                                <p className="text-xs text-gray-500 mt-2">
                                  {note.created_by_name} &middot;{' '}
                                  {new Date(note.created_at).toLocaleString()}
                                </p>
                              </div>
                            ))}
                            {/* Legacy csr_notes field (if exists and no structured notes) */}
                            {selectedQuote.csr_notes &&
                              (!selectedQuote.notes ||
                                selectedQuote.notes.length === 0) && (
                                <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded border border-gray-200 whitespace-pre-wrap">
                                  {selectedQuote.csr_notes}
                                </p>
                              )}
                          </div>
                        </Card>
                      )}

                      {/* Action Buttons */}
                      <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 -mx-8 mt-8">
                        <div className="max-w-4xl mx-auto flex items-center justify-between">
                          <div className="flex gap-3">
                            <Button
                              variant="outline"
                              className="border-gray-300 bg-transparent opacity-50 cursor-not-allowed"
                              disabled
                              title="Edit functionality coming soon"
                            >
                              Edit Quote
                            </Button>
                            <Button
                              variant="outline"
                              className="border-gray-300 bg-transparent"
                              onClick={() => setAddNoteDialogOpen(true)}
                            >
                              Add Note
                            </Button>
                          </div>
                          <div className="flex gap-3">
                            {selectedQuote._permissions.can_reject && (
                              <Button
                                variant="outline"
                                className="border-red-300 text-red-600 hover:bg-red-50"
                                onClick={() => setRejectDialogOpen(true)}
                              >
                                Reject
                              </Button>
                            )}
                            {selectedQuote._permissions.can_validate ? (
                              <Button
                                className="bg-primary hover:bg-primary/90 text-white"
                                onClick={handleSendQuote}
                                disabled={validateMutation.isPending}
                              >
                                {validateMutation.isPending
                                  ? 'Sending...'
                                  : 'Send Quote'}
                              </Button>
                            ) : (
                              <Button className="bg-primary hover:bg-primary/90 text-white">
                                Resend Quote
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Messages Tab */
                  <MessagesTab quote={selectedQuote} />
                )}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-center p-8">
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
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <p className="text-gray-500 text-lg mb-2">
                    Select a quote to view details
                  </p>
                  <p className="text-gray-400 text-sm">
                    Choose a quote from the list to see customer and engagement
                    information
                  </p>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Quote</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this quote. The customer will be
              notified.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Enter rejection reason..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleRejectQuote}
              disabled={!rejectReason || rejectMutation.isPending}
            >
              {rejectMutation.isPending ? 'Rejecting...' : 'Reject Quote'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Note Dialog */}
      <Dialog open={addNoteDialogOpen} onOpenChange={setAddNoteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add CSR Note</DialogTitle>
            <DialogDescription>
              Add an internal note to this quote. Notes are only visible to staff
              members.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Enter your note..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddNoteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleAddNote}
              disabled={!newNote.trim() || addNoteMutation.isPending}
            >
              {addNoteMutation.isPending ? 'Saving...' : 'Add Note'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
