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
  status:
    | 'DRAFT'
    | 'SUBMITTED'
    | 'APPROVED'
    | 'REJECTED'
    | 'RETURNED'
    | 'PENDING_SECOND_APPROVAL';
  assignedReviewer?: { id: string } | null;
  // F-06: the reviewer named for the second stage. Null on every single
  // stage claim, and never null while the status is PENDING_SECOND_APPROVAL.
  secondReviewer?: { id: string } | null;
  requester?: { id: string } | null;
}

export function selectReviewQueue<T extends QueueCandidate>(
  requests: T[],
  reviewerId: string
): T[] {
  return requests.filter((r) => {
    // Not raised by them. BR-01 is enforced in the route handler regardless;
    // this only keeps a reviewer from meeting their own work in the queue. It
    // holds for both stages, which is why it is tested before anything else.
    if (r.requester?.id === reviewerId) return false;

    // Stage one: assigned to this reviewer and still awaiting a decision.
    // Without the status test the queue never empties, and the empty state
    // promises something the screen does not do.
    if (r.assignedReviewer?.id === reviewerId && r.status === 'SUBMITTED') {
      return true;
    }

    // Stage two (F-06): escalated to this reviewer and waiting on them. The
    // first reviewer is deliberately not matched here, because they are the
    // assigned reviewer rather than the second one, and dual control means the
    // claim is no longer theirs to decide.
    if (
      r.secondReviewer?.id === reviewerId &&
      r.status === 'PENDING_SECOND_APPROVAL'
    ) {
      return true;
    }

    return false;
  });
}
