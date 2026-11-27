'use client';

import { useState } from 'react';
import { CheckCircle2, XCircle, Undo2, AlertTriangle, Loader2 } from 'lucide-react';
import {
  MIN_DECISION_COMMENT_LENGTH,
  DECISION_COMMENT_REQUIRED_MESSAGE,
  MIN_RETURN_COMMENT_LENGTH,
  RETURN_COMMENT_REQUIRED_MESSAGE,
} from '@/lib/review-rules';

type ReviewAction = 'APPROVE' | 'REJECT' | 'RETURN';

export interface ReviewTarget {
  id: string;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'RETURNED';
  requesterId: string;
  assignedReviewerId: string | null;
}

/**
 * The Approve and Reject controls on the request detail page (F-04, AC-39).
 *
 * Deciding whether to render is kept separate from deciding whether to allow:
 * every condition below is also enforced by POST /api/requests/:id/review, and
 * the refusals are tested in tests/api/review-guards.test.ts. Hiding a control
 * is not authorization — this only avoids inviting a click that would be
 * refused.
 */
export default function ReviewDecisionPanel({
  request,
  viewerId,
  onDecided,
}: {
  request: ReviewTarget;
  viewerId: string | null;
  onDecided?: () => void;
}) {
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState<ReviewAction | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Until /api/auth/me resolves there is nobody to check against, so nothing is
  // offered rather than flashing a control at a viewer who may not use it.
  if (!viewerId) return null;
  // BR-01, on screen. The API refuses this with 403 SELF_APPROVAL.
  if (request.requesterId === viewerId) return null;
  // BR-05, on screen. The API refuses this with 403 FORBIDDEN.
  if (request.assignedReviewerId !== viewerId) return null;
  // BR-02, on screen. Nothing but a submitted request can be decided.
  if (request.status !== 'SUBMITTED') return null;

  async function decide(action: ReviewAction) {
    setError(null);

    // Checked here as well as by the API so the reviewer is told before a round
    // trip, not after one. FR-05 requires a reason for every decision, and
    // BR-07 requires a longer one to return a claim, because that reason is the
    // instruction the requester has to work from.
    const isReturn = action === 'RETURN';
    const minLength = isReturn
      ? MIN_RETURN_COMMENT_LENGTH
      : MIN_DECISION_COMMENT_LENGTH;

    if (comment.trim().length < minLength) {
      setError(
        `${isReturn ? RETURN_COMMENT_REQUIRED_MESSAGE : DECISION_COMMENT_REQUIRED_MESSAGE}.`
      );
      return;
    }

    setBusy(action);
    try {
      const res = await fetch(`/api/requests/${request.id}/review`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action, comment: comment.trim() }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        // The server message, never a stack trace, and whatever was typed stays
        // in the box so it does not have to be written again.
        setError(body?.error?.message ?? 'The decision could not be recorded. Please try again.');
        return;
      }

      onDecided?.();
    } catch {
      setError('Could not reach the server. Please try again.');
    } finally {
      setBusy(null);
    }
  }

  const disabled = busy !== null;

  return (
    <section
      data-testid="review-decision-panel"
      className="rounded-lg border border-slate-200 bg-white p-6"
    >
      <h2 className="text-sm font-semibold text-slate-700">Your decision</h2>
      <p className="mt-1 text-sm text-slate-500">
        A reason of at least {MIN_DECISION_COMMENT_LENGTH} characters is required to approve or
        reject, and at least {MIN_RETURN_COMMENT_LENGTH} to return the claim for revision. It is
        recorded against your decision either way.
      </p>

      <label htmlFor="review-comment" className="sr-only">
        Reason for your decision
      </label>
      <textarea
        id="review-comment"
        data-testid="review-comment"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        disabled={disabled}
        rows={3}
        placeholder="Why are you approving, rejecting or returning this claim?"
        className="mt-4 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50"
      />

      {error && (
        <div
          role="alert"
          data-testid="review-error"
          className="mt-3 flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          data-testid="review-approve"
          onClick={() => decide('APPROVE')}
          disabled={disabled}
          className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
        >
          {busy === 'APPROVE' ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          )}
          Approve
        </button>

        <button
          type="button"
          data-testid="review-reject"
          onClick={() => decide('REJECT')}
          disabled={disabled}
          className="inline-flex items-center gap-2 rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-rose-300"
        >
          {busy === 'REJECT' ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <XCircle className="h-4 w-4" aria-hidden="true" />
          )}
          Reject
        </button>

        <button
          type="button"
          data-testid="review-return"
          onClick={() => decide('RETURN')}
          disabled={disabled}
          className="inline-flex items-center gap-2 rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-orange-300"
        >
          {busy === 'RETURN' ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Undo2 className="h-4 w-4" aria-hidden="true" />
          )}
          Return for revision
        </button>
      </div>
    </section>
  );
}
