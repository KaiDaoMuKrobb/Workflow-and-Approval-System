'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  RefreshCw,
  AlertTriangle,
  FileQuestion,
  History as HistoryIcon,
} from 'lucide-react';
import ReviewDecisionPanel from '@/components/ReviewDecisionPanel';

interface ExpenseItem {
  id: string;
  category: string;
  description: string;
  amount: string;
}

interface HistoryEntry {
  id: string;
  action: string;
  fromStatus: string | null;
  toStatus: string;
  comment: string | null;
  createdAt: string;
  actor?: { id: string; name: string; role?: string } | null;
}

interface RequestDetail {
  id: string;
  requestNumber: string;
  title: string;
  description: string;
  totalAmount: string;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  updatedAt: string;
  requesterId: string;
  assignedReviewerId: string | null;
  requester?: { id: string; name: string; department?: string } | null;
  assignedReviewer?: { id: string; name: string } | null;
  items: ExpenseItem[];
  history: HistoryEntry[];
}

const STATUS_STYLES: Record<RequestDetail['status'], string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  SUBMITTED: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-emerald-100 text-emerald-800',
  REJECTED: 'bg-rose-100 text-rose-800',
};

export default function RequestDetailPage({ params }: { params: { id: string } }) {
  const [request, setRequest] = useState<RequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Who is viewing. The decision controls cannot be offered until this is known,
  // which is why ReviewDecisionPanel renders nothing while it is null.
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [viewerRole, setViewerRole] = useState<'REQUESTER' | 'REVIEWER' | null>(null);

  // This page is reached from two different screens. A reviewer arrives from the
  // review queue, a requester from their own claim list, and sending both to the
  // reviewer dashboard stranded the requester on a page built for somebody else.
  // Until the session is known, the claim list is the safe answer: every account
  // has one.
  const backHref = viewerRole === 'REVIEWER' ? '/reviewer/dashboard' : '/requests';
  const backLabel = viewerRole === 'REVIEWER' ? 'Back to dashboard' : 'Back to my claims';

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNotFound(false);
    try {
      const res = await fetch(`/api/requests/${params.id}`);

      // A 404 here means either the request does not exist or the caller may not
      // see it. The two are deliberately indistinguishable (DEC-03), so the screen
      // must not try to tell them apart either.
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      if (!res.ok) {
        setError('Could not load this request. Please try again.');
        return;
      }

      const body = await res.json();
      setRequest(body.data.request);
    } catch {
      setError('Could not reach the server. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) return;
        const body = await res.json();
        if (!cancelled) {
          setViewerId(body.data.user.id);
          setViewerRole(body.data.user.role);
        }
      } catch {
        // The page is still readable without knowing the viewer; it simply
        // offers no decision controls.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6">
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {backLabel}
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        {loading && (
          <div
            role="status"
            className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-6 py-12 text-slate-500"
          >
            <RefreshCw className="h-5 w-5 animate-spin" aria-hidden="true" />
            Loading the request…
          </div>
        )}

        {!loading && notFound && (
          <div className="flex flex-col items-center rounded-lg border border-slate-200 bg-white px-6 py-16 text-center">
            <FileQuestion className="mb-3 h-10 w-10 text-slate-400" aria-hidden="true" />
            <p className="text-base font-medium text-slate-700">Request not found</p>
            <Link href={backHref} className="mt-4 text-sm font-medium text-indigo-600 hover:text-indigo-800">
              {viewerRole === 'REVIEWER' ? 'Return to the dashboard' : 'Return to my claims'}
            </Link>
          </div>
        )}

        {!loading && !notFound && error && (
          <div role="alert" className="flex flex-col items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 px-6 py-6">
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

        {!loading && !notFound && !error && request && (
          <div className="space-y-6">
            <section className="rounded-lg border border-slate-200 bg-white p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-xs text-slate-500">{request.requestNumber}</p>
                  <h1 className="mt-1 text-xl font-semibold text-slate-900">{request.title}</h1>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[request.status]}`}>
                  {request.status}
                </span>
              </div>

              {request.description && (
                <p className="mt-4 text-sm text-slate-600">{request.description}</p>
              )}

              <dl className="mt-6 grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-slate-500">Requester</dt>
                  <dd className="mt-1 font-medium text-slate-900">
                    {request.requester?.name ?? '—'}
                    {request.requester?.department ? ` · ${request.requester.department}` : ''}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Assigned reviewer</dt>
                  <dd className="mt-1 font-medium text-slate-900">
                    {request.assignedReviewer?.name ?? 'Not yet assigned'}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Submitted</dt>
                  <dd className="mt-1 font-medium text-slate-900">
                    {new Date(request.createdAt).toLocaleDateString('en-GB')}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
              <h2 className="border-b border-slate-200 px-6 py-3 text-sm font-semibold text-slate-700">
                Line items
              </h2>
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left font-semibold text-slate-600">Category</th>
                    <th scope="col" className="px-6 py-3 text-left font-semibold text-slate-600">Description</th>
                    <th scope="col" className="px-6 py-3 text-right font-semibold text-slate-600">Amount (THB)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {request.items.map((item) => (
                    <tr key={item.id} data-testid="line-item-row">
                      <td className="px-6 py-3 text-slate-700">{item.category}</td>
                      <td className="px-6 py-3 text-slate-600">{item.description || '—'}</td>
                      {/* String straight from the API — never parsed into a number (DEC-04). */}
                      <td className="px-6 py-3 text-right font-mono text-slate-900">{item.amount}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50">
                  <tr>
                    <td colSpan={2} className="px-6 py-3 text-right font-semibold text-slate-700">Total</td>
                    <td className="px-6 py-3 text-right font-mono font-semibold text-slate-900">
                      {request.totalAmount}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </section>

            <ReviewDecisionPanel
              request={{
                id: request.id,
                status: request.status,
                requesterId: request.requesterId,
                assignedReviewerId: request.assignedReviewerId,
              }}
              viewerId={viewerId}
              onDecided={load}
            />

            <section className="rounded-lg border border-slate-200 bg-white p-6">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <HistoryIcon className="h-4 w-4" aria-hidden="true" />
                Approval history
              </h2>
              <ol className="space-y-3">
                {/* Oldest first, so the list reads as the story of the request. The API
                    returns newest first, so it is reversed here rather than re-queried. */}
                {[...request.history].reverse().map((entry) => (
                  <li
                    key={entry.id}
                    data-testid="history-entry"
                    className="rounded-md border border-slate-200 px-4 py-3 text-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium text-slate-900">
                        {entry.action}
                        <span className="font-normal text-slate-500">
                          {' '}
                          {entry.fromStatus ? `${entry.fromStatus} → ` : ''}
                          {entry.toStatus}
                        </span>
                      </span>
                      <span className="text-xs text-slate-500">
                        {entry.actor?.name ?? 'Unknown'} ·{' '}
                        {new Date(entry.createdAt).toLocaleString('en-GB')}
                      </span>
                    </div>
                    {entry.comment && <p className="mt-2 text-slate-600">{entry.comment}</p>}
                  </li>
                ))}
              </ol>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
