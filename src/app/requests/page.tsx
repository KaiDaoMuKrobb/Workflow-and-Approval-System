'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Plus,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  LogOut,
  ChevronRight,
  Receipt,
  User,
  ClipboardList,
  Search,
  Filter,
  X,
  ChevronLeft,
  Calendar,
  RotateCcw,
} from 'lucide-react';

interface ExpenseItem {
  id: string;
  category: string;
  description: string;
  amount: string;
}

interface ExpenseRequest {
  id: string;
  requestNumber: string;
  title: string;
  description: string;
  totalAmount: string;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'RETURNED';
  createdAt: string;
  items: ExpenseItem[];
}

export default function RequestsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<ExpenseRequest[]>([]);
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; role: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, totalCount: 0, totalPages: 1 });
  const [stats, setStats] = useState({ drafts: 0, submitted: 0, approved: 0, returned: 0 });

  const fetchRequests = useCallback(
    async (targetPage = page) => {
      try {
        const params = new URLSearchParams();
        if (searchTerm.trim()) params.set('search', searchTerm.trim());
        if (statusFilter) params.set('status', statusFilter);
        if (categoryFilter) params.set('category', categoryFilter);
        if (fromDate) params.set('from', fromDate);
        if (toDate) params.set('to', toDate);
        params.set('page', String(targetPage));
        params.set('pageSize', String(pageSize));

        const res = await fetch(`/api/requests?${params.toString()}`);
        if (res.ok) {
          const resData = await res.json();
          setRequests(resData.data.requests || []);
          if (resData.data.pagination) {
            setPagination(resData.data.pagination);
          }
          if (resData.data.stats) {
            setStats(resData.data.stats);
          }
        } else {
          setError('Failed to load expense requests.');
        }
      } catch (err) {
        setError('Failed to load expense requests.');
      } finally {
        setLoading(false);
      }
    },
    [searchTerm, statusFilter, categoryFilter, fromDate, toDate, page, pageSize]
  );

  useEffect(() => {
    async function loadInitial() {
      try {
        const userRes = await fetch('/api/auth/me');
        if (!userRes.ok) {
          router.push('/login');
          return;
        }
        const userData = await userRes.json();
        setCurrentUser(userData.data.user);

        await fetchRequests(1);
      } catch {
        setError('Failed to initialize claims dashboard.');
        setLoading(false);
      }
    }
    loadInitial();
  }, [router]);

  // Refetch when filters change (resets to page 1)
  const handleFilterChange = (updater: () => void) => {
    updater();
    setPage(1);
  };

  useEffect(() => {
    fetchRequests(page);
  }, [page, statusFilter, categoryFilter, fromDate, toDate]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchRequests(1);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setCategoryFilter('');
    setFromDate('');
    setToDate('');
    setPage(1);
  };

  const hasActiveFilters = Boolean(searchTerm || statusFilter || categoryFilter || fromDate || toDate);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch {
      router.push('/login');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5" /> Draft
          </span>
        );
      case 'SUBMITTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Clock className="w-3.5 h-3.5" /> Submitted
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" /> Approved
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3.5 h-3.5" /> Rejected
          </span>
        );
      case 'RETURNED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200">
            <RotateCcw className="w-3.5 h-3.5" /> Returned for Revision
          </span>
        );
      default:
        return <span className="px-2.5 py-1 text-xs font-semibold bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3"></div>
          <p className="text-sm text-slate-500 font-medium">Loading claims dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Navigation */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 text-white rounded-xl shadow-sm">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <span className="text-lg font-bold text-slate-900 tracking-tight">ExpenseFlow</span>
                <span className="ml-2 text-xs font-semibold uppercase px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                  {currentUser?.role === 'REVIEWER' ? 'Reviewer' : 'Requester'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {currentUser?.role === 'REVIEWER' && (
                <Link
                  href="/reviewer/dashboard"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                >
                  <ClipboardList className="w-3.5 h-3.5 text-indigo-600" />
                  Review Queue
                </Link>
              )}
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-semibold">
                  {currentUser?.name?.charAt(0) || <User className="w-4 h-4" />}
                </div>
                <div className="hidden sm:block text-left">
                  <div className="font-semibold text-slate-900">{currentUser?.name}</div>
                  <div className="text-xs text-slate-500">{currentUser?.role}</div>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                title="Sign out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header & New Request Button */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Expense Claims</h1>
            <p className="text-sm text-slate-500 mt-1">Manage, itemize, and submit reimbursement requests</p>
          </div>

          <Link
            href="/requests/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            New Expense Claim
          </Link>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Drafts</div>
            <div className="text-2xl font-bold text-amber-600">{stats.drafts}</div>
            <div className="text-xs text-slate-400 mt-1">Editable claims awaiting submission</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Pending Review</div>
            <div className="text-2xl font-bold text-blue-600">{stats.submitted}</div>
            <div className="text-xs text-slate-400 mt-1">Submitted for managerial decision</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Returned</div>
            <div className="text-2xl font-bold text-orange-600">{stats.returned || 0}</div>
            <div className="text-xs text-slate-400 mt-1">Returned by reviewer for revision</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Approved Claims</div>
            <div className="text-2xl font-bold text-emerald-600">{stats.approved}</div>
            <div className="text-xs text-slate-400 mt-1">Ready for disbursement</div>
          </div>
        </div>

        {/* Multi-Criteria Search & Filter Controls (AC-77 / FR-08) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-6">
          <form onSubmit={handleSearchSubmit} className="space-y-4">
            <div className="flex flex-col md:flex-row gap-3">
              {/* Keyword Search */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by title, description, or EXP number (e.g. EXP-2026-0001)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                />
              </div>

              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition inline-flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Search className="w-4 h-4" />
                Search
              </button>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition inline-flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset
                </button>
              )}
            </div>

            {/* Filter Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1 border-t border-slate-100">
              {/* Status Filter */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => handleFilterChange(() => setStatusFilter(e.target.value))}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                >
                  <option value="">All Statuses</option>
                  <option value="DRAFT">Draft</option>
                  <option value="SUBMITTED">Submitted</option>
                  <option value="RETURNED">Returned for Revision</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>

              {/* Category Filter */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Expense Category</label>
                <select
                  value={categoryFilter}
                  onChange={(e) => handleFilterChange(() => setCategoryFilter(e.target.value))}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
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

              {/* From Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">From Date</label>
                <div className="relative">
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => handleFilterChange(() => setFromDate(e.target.value))}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* To Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">To Date</label>
                <div className="relative">
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => handleFilterChange(() => setToDate(e.target.value))}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Active filter tags */}
            {hasActiveFilters && (
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
                <span className="font-semibold text-slate-500">Active filters:</span>
                {searchTerm && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-medium">
                    Search: &ldquo;{searchTerm}&rdquo;
                    <button
                      type="button"
                      onClick={() => {
                        setSearchTerm('');
                        setPage(1);
                      }}
                      className="hover:text-blue-900"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {statusFilter && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-medium">
                    Status: {statusFilter}
                    <button
                      type="button"
                      onClick={() => {
                        setStatusFilter('');
                        setPage(1);
                      }}
                      className="hover:text-indigo-900"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {categoryFilter && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 font-medium">
                    Category: {categoryFilter}
                    <button
                      type="button"
                      onClick={() => {
                        setCategoryFilter('');
                        setPage(1);
                      }}
                      className="hover:text-purple-900"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {fromDate && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-medium">
                    From: {fromDate}
                    <button
                      type="button"
                      onClick={() => {
                        setFromDate('');
                        setPage(1);
                      }}
                      className="hover:text-amber-900"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {toDate && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-medium">
                    To: {toDate}
                    <button
                      type="button"
                      onClick={() => {
                        setToDate('');
                        setPage(1);
                      }}
                      className="hover:text-amber-900"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
              </div>
            )}
          </form>
        </div>

        {/* Request List */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Claims History</h2>
            <span className="text-xs font-medium text-slate-500">
              {pagination.totalCount} {pagination.totalCount === 1 ? 'claim' : 'claims'} found
            </span>
          </div>

          {requests.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-3">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">No expense claims found</h3>
              <p className="text-sm text-slate-500 mt-1 mb-6 max-w-sm mx-auto">
                {hasActiveFilters
                  ? 'No claims match your active filter criteria. Try resetting or widening your query filters.'
                  : "You haven't created any reimbursement requests yet. Start by submitting your out-of-pocket expenses."}
              </p>
              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-200 transition"
                >
                  <RotateCcw className="w-4 h-4" />
                  Clear all filters
                </button>
              ) : (
                <Link
                  href="/requests/new"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition"
                >
                  <Plus className="w-4 h-4" />
                  Create your first claim
                </Link>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {requests.map((r) => (
                <div
                  key={r.id}
                  className="p-5 sm:p-6 hover:bg-slate-50/80 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                      <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-md">
                        {r.requestNumber}
                      </span>
                      {getStatusBadge(r.status)}
                      <span className="text-xs text-slate-400">
                        {new Date(r.createdAt).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>

                    <h3 className="text-base font-semibold text-slate-900 truncate">{r.title}</h3>
                    <p className="text-sm text-slate-500 mt-0.5 line-clamp-1">
                      {r.description || 'No description provided.'}
                    </p>

                    <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                      <span>{r.items?.length || 0} itemized lines</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 sm:self-center w-full sm:w-auto justify-between sm:justify-end pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <div className="text-left sm:text-right">
                      <div className="text-xs text-slate-400 font-medium">Total Amount</div>
                      <div className="text-lg font-bold text-slate-900">฿{r.totalAmount}</div>
                    </div>

                    {r.status === 'DRAFT' || r.status === 'RETURNED' ? (
                      <Link
                        href={`/requests/new?id=${r.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                      >
                        {r.status === 'RETURNED' ? 'Edit & Resubmit' : 'Edit / Submit'}
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    ) : (
                      <span className="text-xs font-medium text-slate-400 py-1.5">Locked</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Interactive Pagination Controls (AC-74 / AC-77) */}
          {pagination.totalPages > 1 && (
            <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
              <div>
                Showing {(pagination.page - 1) * pagination.pageSize + 1} to{' '}
                {Math.min(pagination.page * pagination.pageSize, pagination.totalCount)} of{' '}
                {pagination.totalCount} claims
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
        </div>
      </main>
    </div>
  );
}

