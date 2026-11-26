'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  BarChart3,
  TrendingUp,
  Building2,
  PieChart,
  Calendar,
  RefreshCw,
  LogOut,
  ChevronLeft,
  ShieldAlert,
  ArrowUpRight,
} from 'lucide-react';

interface SummaryData {
  summary: {
    totalApprovedAmount: number;
    totalApprovedClaims: number;
    activeDepartmentCount: number;
  };
  byDepartment: Array<{
    department: string;
    totalAmount: number;
    claimCount: number;
  }>;
  byCategory: Array<{
    category: string;
    totalAmount: number;
    percentage: number;
  }>;
  monthlyTotals: Array<{
    year: number;
    month: number;
    totalAmount: number;
    claimCount: number;
  }>;
}

interface SessionUser {
  id: string;
  name: string;
  role: 'REQUESTER' | 'REVIEWER';
  department: string;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function ReportsPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/reports/summary');
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      if (res.status === 403) {
        setForbidden(true);
        setLoading(false);
        return;
      }
      if (!res.ok) {
        setError('Failed to fetch analytics summary. Please try again.');
        return;
      }
      const json = await res.json();
      setData(json.data);
    } catch {
      setError('Could not connect to analytics server.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    async function init() {
      try {
        const meRes = await fetch('/api/auth/me');
        if (meRes.status === 401) {
          router.push('/login');
          return;
        }
        if (meRes.ok) {
          const me = await meRes.json();
          const sessionUser: SessionUser = me.data.user;
          setUser(sessionUser);
          if (sessionUser.role !== 'REVIEWER') {
            setForbidden(true);
            setLoading(false);
            return;
          }
          await fetchReports();
        }
      } catch {
        setError('Session check failed.');
        setLoading(false);
      }
    }
    init();
  }, [router, fetchReports]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      router.push('/login');
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 2,
    }).format(val);
  };

  if (forbidden) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-rose-200 p-6 text-center">
          <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Access Restricted</h2>
          <p className="text-sm text-slate-600 mb-6">
            Department analytics and financial reports are reserved for managerial and reviewer roles (FR-09 / AC-81).
          </p>
          <Link
            href="/requests"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium transition"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to My Requests
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Top Navigation */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/reviewer/dashboard"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-indigo-600 transition"
            >
              <ChevronLeft className="w-4 h-4" />
              Reviewer Dashboard
            </Link>
            <span className="text-slate-300">|</span>
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-indigo-600 p-2 text-white shadow-sm">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900 leading-tight">Department Analytics & Reports</h1>
                <p className="text-xs text-slate-500">Authoritative spend metrics across approved claims (FR-09)</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {user && (
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-slate-800">{user.name}</p>
                <p className="text-xs text-slate-500">{user.department} - <span className="font-semibold text-indigo-600">{user.role}</span></p>
              </div>
            )}
            <button
              onClick={fetchReports}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 text-xs font-medium transition"
              title="Refresh Analytics"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 text-xs font-medium transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 space-y-6">
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-sm flex items-center justify-between">
            <span>{error}</span>
            <button onClick={fetchReports} className="underline text-xs font-semibold">Retry</button>
          </div>
        )}

        {/* High-Level KPI Summary Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-bold">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Approved Spend</p>
              <p className="text-2xl font-bold text-slate-900">
                {data ? formatCurrency(data.summary.totalApprovedAmount) : '฿0.00'}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Aggregated from verified claims</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-bold">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Active Departments</p>
              <p className="text-2xl font-bold text-slate-900">
                {data ? data.summary.activeDepartmentCount : 0}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Departments with approved claims</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-violet-50 text-violet-600 rounded-xl flex items-center justify-center font-bold">
              <PieChart className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Approved Claims</p>
              <p className="text-2xl font-bold text-slate-900">
                {data ? data.summary.totalApprovedClaims : 0}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Reimbursements fully processed</p>
            </div>
          </div>
        </section>

        {/* Detailed Breakdown Grids */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Section 1: Department Spend Distribution (AC-84) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Spend by Department (AC-84)</h3>
              </div>
              <span className="text-xs font-semibold text-slate-500">
                {data?.byDepartment.length || 0} Departments
              </span>
            </div>
            <div className="p-6">
              {!data || data.byDepartment.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">No approved department claims found.</div>
              ) : (
                <div className="space-y-4">
                  {data.byDepartment.map((dept) => {
                    const maxAmount = data.summary.totalApprovedAmount || 1;
                    const pct = Math.round((dept.totalAmount / maxAmount) * 100);
                    return (
                      <div key={dept.department} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-800">{dept.department}</span>
                          <div className="text-right">
                            <span className="font-bold text-slate-900">{formatCurrency(dept.totalAmount)}</span>
                            <span className="text-slate-400 ml-2">({dept.claimCount} claims)</span>
                          </div>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Category Breakdown (AC-85) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PieChart className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">Category Distribution (AC-85)</h3>
              </div>
              <span className="text-xs font-semibold text-slate-500">
                {data?.byCategory.length || 0} Categories
              </span>
            </div>
            <div className="p-6">
              {!data || data.byCategory.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">No approved category items recorded.</div>
              ) : (
                <div className="space-y-4">
                  {data.byCategory.map((cat) => (
                    <div key={cat.category} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800">{cat.category}</span>
                        <div className="text-right">
                          <span className="font-bold text-slate-900">{formatCurrency(cat.totalAmount)}</span>
                          <span className="text-emerald-600 font-semibold ml-2">({cat.percentage}%)</span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(cat.percentage, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section 3: Monthly Spend History */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-violet-600" />
              <h3 className="text-sm font-bold text-slate-900">Monthly Expenditure History</h3>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              {data?.monthlyTotals.length || 0} Active Months
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-500 font-semibold">
                  <th className="py-3 px-6">Month / Year</th>
                  <th className="py-3 px-6 text-center">Approved Claims</th>
                  <th className="py-3 px-6 text-right">Total Expenditure</th>
                  <th className="py-3 px-6 text-right">Average per Claim</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {!data || data.monthlyTotals.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400">
                      No historical spending data available yet.
                    </td>
                  </tr>
                ) : (
                  data.monthlyTotals.map((m) => {
                    const avg = m.claimCount > 0 ? m.totalAmount / m.claimCount : 0;
                    return (
                      <tr key={`${m.year}-${m.month}`} className="hover:bg-slate-50 transition">
                        <td className="py-3.5 px-6 font-semibold text-slate-800 flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {MONTH_NAMES[m.month - 1]} {m.year}
                        </td>
                        <td className="py-3.5 px-6 text-center text-slate-600">
                          <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-medium">
                            {m.claimCount}
                          </span>
                        </td>
                        <td className="py-3.5 px-6 text-right font-bold text-slate-900">
                          {formatCurrency(m.totalAmount)}
                        </td>
                        <td className="py-3.5 px-6 text-right text-slate-500">
                          {formatCurrency(avg)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Link Banner */}
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs text-indigo-900">
          <div>
            <span className="font-bold">Next: Financial Export Feature (F-09)</span>
            <p className="text-indigo-700 mt-0.5">CSV/JSON export of verified claims is scheduled under Sprint 3 contract specification.</p>
          </div>
          <Link
            href="/reviewer/dashboard"
            className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-800 transition"
          >
            Reviewer Queue <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </main>
  );
}
