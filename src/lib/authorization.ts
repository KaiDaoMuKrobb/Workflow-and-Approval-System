/**
 * The one named home of "may this user see this request?".
 *
 * `F-02` wrote this condition inline in the read handler, where it had no name
 * and no explanation. `F-04` moved it here.
 *
 * It is NOT what `POST /api/requests/:id/review` asks. That endpoint checks only
 * that the request exists, and lets the BR-01 and BR-05 guards decide what the
 * caller may do, because `AC-33` requires `403 FORBIDDEN` where this rule
 * requires `404`. `F-04` contract §7 and §9.5 carry the reasoning.
 *
 * `GET /api/requests` states the same rule a third way, as a Prisma `where`
 * clause, because a list cannot use a predicate over a loaded row.
 */

/** The only fields the visibility rule depends on. */
export interface VisibilityFields {
  requesterId: string;
  assignedReviewerId: string | null;
}

/**
 * `BR-05`, read half. A request is visible to the person who raised it and to
 * the reviewer it was assigned to. Nobody else, regardless of role: holding the
 * `REVIEWER` role does not grant sight of every request.
 *
 * Callers answer `404` rather than `403` when this returns false, so the two are
 * indistinguishable from outside (`DEC-03`).
 *
 * Written as a type predicate so a caller that has checked visibility also knows
 * the record is present, without a second query or a non-null assertion.
 */
export function canViewRequest<T extends VisibilityFields>(
  request: T | null | undefined,
  userId: string
): request is T {
  if (!request) return false;
  return request.requesterId === userId || request.assignedReviewerId === userId;
}
