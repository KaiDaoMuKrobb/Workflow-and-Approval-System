import { describe, it, expect } from 'vitest';
import { selectReviewQueue, QueueCandidate } from '../../src/lib/review-queue';

/**
 * FR-04 — what belongs in a reviewer's queue.
 *
 * `GET /api/requests` returns everything the caller is entitled to see, which is
 * `AC-20` .. `AC-22` and a property of the endpoint. The queue is narrower, and
 * `FR-04` in `docs/srs.md` fixes how much narrower: the `SUBMITTED` requests
 * assigned to that reviewer.
 *
 * Added with `F-04`, after opening the dashboard and finding a request that had
 * just been approved still sitting in it.
 */
describe('FR-04: the reviewer queue selection', () => {
  const CAROL = 'user-carol';
  const ALICE = 'user-alice';
  const DAVID = 'user-david';

  const base: QueueCandidate = {
    status: 'SUBMITTED',
    assignedReviewer: { id: CAROL },
    requester: { id: ALICE },
  };

  function queue(rows: QueueCandidate[]) {
    return selectReviewQueue(rows, CAROL);
  }

  it('TEST-28d: a SUBMITTED request assigned to the reviewer is in the queue', () => {
    // The success case. Every other test here removes something, so without this
    // one a function that returned nothing at all would pass them all.
    expect(queue([base])).toHaveLength(1);
  });

  it('TEST-28e (FR-04): a request the reviewer has already decided leaves the queue', () => {
    expect(queue([{ ...base, status: 'APPROVED' }])).toHaveLength(0);
    expect(queue([{ ...base, status: 'REJECTED' }])).toHaveLength(0);
    expect(queue([{ ...base, status: 'DRAFT' }])).toHaveLength(0);
  });

  it('TEST-28f: requests assigned elsewhere, or raised by the reviewer, are not in the queue', () => {
    const assignedToDavid: QueueCandidate = { ...base, assignedReviewer: { id: DAVID } };
    const raisedByCarol: QueueCandidate = { ...base, requester: { id: CAROL } };
    const unassigned: QueueCandidate = { ...base, assignedReviewer: null };

    expect(queue([assignedToDavid, raisedByCarol, unassigned])).toHaveLength(0);
  });

  it('TEST-28g: a mixed list keeps only the rows that qualify, and keeps their order', () => {
    const first = { ...base, id: 'a' };
    const decided = { ...base, id: 'b', status: 'APPROVED' as const };
    const second = { ...base, id: 'c' };

    const result = queue([first, decided, second]) as Array<QueueCandidate & { id: string }>;

    expect(result.map((r) => r.id)).toEqual(['a', 'c']);
  });
});
