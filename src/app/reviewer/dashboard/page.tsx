'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ClipboardList,
  LogOut,
  RefreshCw,
  AlertTriangle,
  FileText,
  Search,
  Filter,
  X,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  BarChart3,
} from 'lucide-react';
import ReviewerQueue, { QueueRequest } from '@/components/ReviewerQueue';

interface SessionUser {
  id: string;
  name: string;
  role: 'REQUESTER' | 'REVIEWER';
  department: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [requests, setRequests] = useState<QueueRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search, Filter & Pagination states (AC-77)
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, totalCount: 0, totalPages: 1 });

  const fetchQueue = useCallback(
    async (targetPage = page) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        params.set('queue', 'true');
        params.set('page', String(targetPage));
        params.set('pageSize', String(pageSize));
        if (searchTerm.trim()) params.set('search', searchTerm.trim());
        if (categoryFilter) params.set('category', categoryFilter);
        if (fromDate) params.set('from', fromDate);
        if (toDate) params.set('to', toDate);

        const listRes = await fetch(`/api/requests?${params.toString()}`);
        if (!listRes.ok) {
          setError('Could not load the review queue. Please try again.');
          return;
        }
        const listData = await listRes.json();
        setRequests(listData.data?.requests || []);
        if (listData.data?.pagination) {
          setPagination(listData.data.pagination);
        }
      } catch {
        setError('Could not reach the server. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    [searchTerm, categoryFilter, fromDate, toDate, page, pageSize]
  );

  useEffect(() => {
    async function initUser() {
      try {
        const meRes = await fetch('/api/auth/me');
        if (meRes.status === 401) {
          router.push('/login');
          return;
        }
        if (!meRes.ok) {
          setError('Could not confirm your session. Please try again.');
          return;
        }
        const me = await meRes.json();
        const sessionUser: SessionUser = me.data.user;

        if (sessionUser.role !== 'REVIEWER') {
          router.replace('/requests');
          return;
        }

        setUser(sessionUser);
        await fetchQueue(1);
      } catch {
        setError('Could not reach the server. Please try again.');
        setLoading(false);
      }
    }
    initUser();
  }, [router]);

  useEffect(() => {
    if (user) {
      fetchQueue(page);
    }
  }, [page, categoryFilter, fromDate, toDate]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchQueue(1);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setCategoryFilter('');
    setFromDate('');
    setToDate('');
    setPage(1);
  };

  const hasActiveFilters = Boolean(searchTerm || categoryFilter || fromDate || toDate);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      router.push('/login');
    }
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <ClipboardList className="h-6 w-6 text-indigo-600" aria-hidden="true" />
            <div>
              <h1 className="text-lg font-semibold text-slate-900">Reviewer Dashboard</h1>
              {user && (
                <p className="text-sm text-slate-500">
                  {user.name} · {user.role} · {user.department}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/reports"
              className="inline-flex items-center gap-2 rounded-md border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100 transition"
            >
              <BarChart3 className="h-4 w-4 text-indigo-600" aria-hidden="true" />
              Analytics (FR-09)
            </Link>
            <Link
              href="/requests"
              className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <FileText className="h-4 w-4" aria-hidden="true" />
              My requests
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Assigned to you ({pagination.totalCount} pending review)
          </h2>
        </div>

        {/* Search & Filter Bar (AC-77) */}
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter queue by title, description, EXP number, or requester name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>

            <button
              type="submit"
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition inline-flex items-center gap-1 shadow-sm"
            >
              <Search className="w-3.5 h-3.5" />
              Search
            </button>

            <div className="w-full sm:w-44">
              <select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              >
                <option value="">All Categories</option>
                <option value="TRAVEL">TRAVEL</option>
                <option value="MEALS">MEALS</option>
                <option value="SUPPLIES">SUPPLIES</option>
                <option value="EQUIPMENT">EQUIPMENT</option>
                <option value="OFFICE_SUPPLIES">OFFICE SUPPLIES</option>
                <option value="OTHER">OTHER</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setPage(1);
                }}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                title="From Date"
              />
              <span className="text-xs text-slate-400">to</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setPage(1);
                }}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                title="To Date"
              />
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition inline-flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
            )}
          </form>

          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
              <span className="font-semibold text-slate-500">Active filters:</span>
              {searchTerm && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-medium">
                  Search: &ldquo;{searchTerm}&rdquo;
                  <button type="button" onClick={() => { setSearchTerm(''); setPage(1); }} className="hover:text-indigo-900">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {categoryFilter && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 font-medium">
                  Category: {categoryFilter}
                  <button type="button" onClick={() => { setCategoryFilter(''); setPage(1); }} className="hover:text-purple-900">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {fromDate && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-medium">
                  From: {fromDate}
                  <button type="button" onClick={() => { setFromDate(''); setPage(1); }} className="hover:text-amber-900">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {toDate && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-medium">
                  To: {toDate}
                  <button type="button" onClick={() => { setToDate(''); setPage(1); }} className="hover:text-amber-900">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              <span className="ml-auto text-slate-400">
                {pagination.totalCount} {pagination.totalCount === 1 ? 'claim' : 'claims'} in queue
              </span>
            </div>
          )}
        </div>

        {loading && (
          <div
            role="status"
            className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-6 py-12 text-slate-500"
          >
            <RefreshCw className="h-5 w-5 animate-spin" aria-hidden="true" />
            Loading the review queue…
          </div>
        )}

        {!loading && error && (
          <div
            role="alert"
            className="flex flex-col items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 px-6 py-6"
          >
            <div className="flex items-center gap-2 text-rose-800">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
              <span className="font-medium">{error}</span>
            </div>
            <button
              type="button"
              onClick={() => fetchQueue(page)}
              className="inline-flex items-center gap-2 rounded-md bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-700"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Try again
            </button>
          </div>
        )}

        {!loading && !error && (
          <>
            {hasActiveFilters && requests.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
                <p className="text-base font-medium text-slate-700">No matching requests found in your queue</p>
                <p className="mt-1 text-sm text-slate-500">Try widening your search terms or clearing active filters.</p>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-semibold transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset all filters
                </button>
              </div>
            ) : (
              <ReviewerQueue requests={requests} />
            )}

            {/* Pagination Controls for Reviewer Dashboard (AC-77) */}
            {pagination.totalPages > 1 && (
              <div className="mt-4 px-4 py-3 bg-white rounded-lg border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 shadow-sm">
                <div>
                  Showing {(pagination.page - 1) * pagination.pageSize + 1} to{' '}
                  {Math.min(pagination.page * pagination.pageSize, pagination.totalCount)} of{' '}
                  {pagination.totalCount} queue claims
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={pagination.page <= 1}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none font-medium transition"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    Previous
                  </button>

                  <span className="px-3 py-1 font-semibold text-slate-700">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>

                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                    disabled={pagination.page >= pagination.totalPages}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none font-medium transition"
                  >
                    Next
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
