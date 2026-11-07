'use client';

import { useEffect, useState } from 'react';
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
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  items: ExpenseItem[];
}

export default function RequestsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<ExpenseRequest[]>([]);
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; role: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const userRes = await fetch('/api/auth/me');
        if (!userRes.ok) {
          router.push('/login');
          return;
        }
        const userData = await userRes.json();
        setCurrentUser(userData.data.user);

        const reqRes = await fetch('/api/requests');
        if (reqRes.ok) {
          const reqData = await reqRes.json();
          setRequests(reqData.data.requests);
        }
      } catch (err) {
        setError('Failed to load expense requests.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [router]);

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

  const draftCount = requests.filter((r) => r.status === 'DRAFT').length;
  const submittedCount = requests.filter((r) => r.status === 'SUBMITTED').length;
  const approvedCount = requests.filter((r) => r.status === 'APPROVED').length;

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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Drafts</div>
            <div className="text-2xl font-bold text-amber-600">{draftCount}</div>
            <div className="text-xs text-slate-400 mt-1">Editable claims awaiting submission</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Pending Review</div>
            <div className="text-2xl font-bold text-blue-600">{submittedCount}</div>
            <div className="text-xs text-slate-400 mt-1">Submitted for managerial decision</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Approved Claims</div>
            <div className="text-2xl font-bold text-emerald-600">{approvedCount}</div>
            <div className="text-xs text-slate-400 mt-1">Ready for disbursement</div>
          </div>
        </div>

        {/* Request List */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Claims History</h2>
            <span className="text-xs font-medium text-slate-500">{requests.length} claims total</span>
          </div>

          {requests.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-3">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">No expense claims found</h3>
              <p className="text-sm text-slate-500 mt-1 mb-6 max-w-sm mx-auto">
                You haven&apos;t created any reimbursement requests yet. Start by submitting your out-of-pocket expenses.
              </p>
              <Link
                href="/requests/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition"
              >
                <Plus className="w-4 h-4" />
                Create your first claim
              </Link>
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

                    {r.status === 'DRAFT' ? (
                      <Link
                        href={`/requests/new?id=${r.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                      >
                        Edit / Submit
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
        </div>
      </main>
    </div>
  );
}

