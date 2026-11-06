/**
 * Which of the requests a reviewer may see belong in their review queue.
 *
 * `GET /api/requests` returns everything the caller is entitled to: their own
 * requests and, for a reviewer, the ones assigned to them. The queue is a
 * narrower thing than that, and `FR-04` in `docs/srs.md` says exactly how much
 * narrower: *"Reviewers can query and view all `SUBMITTED` requests specifically
 * assigned to them."*
 *
 * Kept here rather than inline in the page so that `TEST-28d` .. `TEST-28f` can
 * assert the rule without rendering a screen or mocking a network response.
 */

export interface QueueCandidate {
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  assignedReviewer?: { id: string } | null;
  requester?: { id: string } | null;
}

export function selectReviewQueue<T extends QueueCandidate>(
  requests: T[],
  reviewerId: string
): T[] {
  return requests.filter(
    (r) =>
      // Assigned to this reviewer.
      r.assignedReviewer?.id === reviewerId &&
      // Not raised by them. BR-01 is enforced in the route handler regardless;
      // this only keeps a reviewer from meeting their own work in the queue.
      r.requester?.id !== reviewerId &&
      // Still awaiting a decision. Without this the queue never empties, and the
      // empty state promises something the screen does not do.
      r.status === 'SUBMITTED'
  );
}
