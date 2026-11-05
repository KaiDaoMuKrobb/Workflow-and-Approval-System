'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ClipboardList, LogOut, RefreshCw, AlertTriangle, FileText } from 'lucide-react';
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

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
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
      setUser(sessionUser);

      const listRes = await fetch('/api/requests');
      if (!listRes.ok) {
        setError('Could not load the review queue. Please try again.');
        return;
      }
      const list = await listRes.json();

      // The endpoint returns everything the caller may see: their own requests and,
      // for a reviewer, the ones assigned to them. The queue shows only the second
      // group, so a reviewer who also raises requests does not review their own work
      // from this screen. BR-01 is still enforced server-side in F-04 regardless.
      const assignedToMe: QueueRequest[] = (list.data.requests as Array<
        QueueRequest & { assignedReviewer?: { id: string } | null; requester?: { id: string } | null }
      >).filter((r) => r.assignedReviewer?.id === sessionUser.id && r.requester?.id !== sessionUser.id);

      setRequests(assignedToMe);
    } catch {
      setError('Could not reach the server. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

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
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Assigned to you
        </h2>

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
              onClick={load}
              className="inline-flex items-center gap-2 rounded-md bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-700"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Try again
            </button>
          </div>
        )}

        {!loading && !error && <ReviewerQueue requests={requests} />}
      </div>
    </main>
  );
}
