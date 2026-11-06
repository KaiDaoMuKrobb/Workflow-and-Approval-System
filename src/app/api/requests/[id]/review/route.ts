import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUserFromRequest } from '@/lib/auth';
import { jsonSuccess, jsonError } from '@/lib/api-response';
import { RequestStatus } from '@prisma/client';
import {
  MIN_DECISION_COMMENT_LENGTH,
  DECISION_COMMENT_REQUIRED_MESSAGE,
} from '@/lib/review-rules';

export const dynamic = 'force-dynamic';

/**
 * Thrown inside the transaction when the request stopped being SUBMITTED
 * between step 5 and the write. It rolls the transaction back and is answered
 * with the same 400 INVALID_TRANSITION step 5 would have returned.
 */
class AlreadyDecidedError extends Error {}

/**
 * POST /api/requests/:id/review — F-04.
 *
 * The guards run in the order DEC-06 fixes, and the order is the feature. Each
 * step is numbered against §2.2 of the contract. Moving any of them changes the
 * answer a caller receives, which is why TEST-38 exists: a caller who fails both
 * BR-01 and BR-05 is told about whichever guard ran first.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Step 1 — no session. Before the lookup, so an anonymous caller cannot use
    // the difference between 401 and 404 to discover which ids exist.
    const sessionUser = getSessionUserFromRequest(req);
    if (!sessionUser) {
      return jsonError('Authentication required', 'UNAUTHENTICATED', 401);
    }

    const { id } = params;

    const existingRequest = await prisma.expenseRequest.findUnique({
      where: { id },
    });

    // Step 2 — the request does not exist. Visibility is deliberately NOT asked
    // here, unlike GET /api/requests/:id which answers 404 to anyone who is
    // neither the owner nor the assigned reviewer. AC-33 is locked and requires
    // an unrelated reviewer who tries to decide to receive 403 FORBIDDEN; a
    // visibility test at this step would answer 404 first and make that code
    // unreachable. See F-04 contract section 2.2 and section 9.5.
    if (!existingRequest) {
      return jsonError('Request not found', 'NOT_FOUND', 404);
    }

    const target = existingRequest;

    // Step 3 — BR-01. Before step 4 on purpose: a reviewer who raised the
    // request fails both, and self-approval is the more specific reason and the
    // rule the course requires to be demonstrated.
    if (target.requesterId === sessionUser.id) {
      return jsonError(
        'You cannot decide a request you raised yourself',
        'SELF_APPROVAL',
        403
      );
    }

    // Step 4 — BR-05, decide half.
    if (target.assignedReviewerId !== sessionUser.id) {
      return jsonError(
        'Only the assigned reviewer can decide this request',
        'FORBIDDEN',
        403
      );
    }

    // Step 5 — BR-02. After the permission guards, so a caller without
    // permission never learns whether the request has already been decided.
    if (target.status !== RequestStatus.SUBMITTED) {
      return jsonError(
        'Only a submitted request can be approved or rejected',
        'INVALID_TRANSITION',
        400
      );
    }

    // Step 6 — payload validation.
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return jsonError('A decision body is required', 'VALIDATION_ERROR', 400);
    }

    const { action, comment } = (body ?? {}) as {
      action?: unknown;
      comment?: unknown;
    };

    if (action !== 'APPROVE' && action !== 'REJECT') {
      return jsonError(
        'Action must be either APPROVE or REJECT',
        'VALIDATION_ERROR',
        400
      );
    }

    const trimmedComment =
      typeof comment === 'string' ? comment.trim() : '';

    // FR-05 in docs/srs.md: a reviewer approves or rejects "with a mandatory
    // comment". Both decisions, not only rejection — the audit trail is the
    // point of the rule, and an approval with no reason is exactly the gap
    // FR-05 exists to close.
    if (trimmedComment.length < MIN_DECISION_COMMENT_LENGTH) {
      return jsonError(DECISION_COMMENT_REQUIRED_MESSAGE, 'VALIDATION_ERROR', 400);
    }

    const nextStatus =
      action === 'APPROVE' ? RequestStatus.APPROVED : RequestStatus.REJECTED;

    // Step 7 — the status change and the audit row are one transaction, so a
    // decided request can never exist without the row that explains it.
    //
    // The update repeats the SUBMITTED condition that step 5 already checked.
    // Between that read and this write another request could have decided the
    // same claim: two tabs, a double submit, a retry. Without the condition both
    // would succeed and BR-02 would be broken by a second ApprovalHistory row on
    // a request that was already terminal. With it, the loser updates nothing,
    // and `count === 0` is the signal to answer exactly as step 5 would have.
    const decided = await prisma.$transaction(async (tx) => {
      const { count } = await tx.expenseRequest.updateMany({
        where: { id, status: RequestStatus.SUBMITTED },
        data: { status: nextStatus },
      });

      if (count === 0) {
        throw new AlreadyDecidedError();
      }

      const updated = await tx.expenseRequest.findUniqueOrThrow({
        where: { id },
        include: {
          items: true,
          requester: {
            select: { id: true, name: true, email: true, department: true },
          },
          assignedReviewer: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      await tx.approvalHistory.create({
        data: {
          requestId: id,
          actorId: sessionUser.id,
          fromStatus: RequestStatus.SUBMITTED,
          toStatus: nextStatus,
          action,
          comment: trimmedComment,
        },
      });

      return updated;
    });

    // Read the history back after the transaction so the response carries the
    // whole trail, newest first, matching GET /api/requests/:id (SR-03).
    const history = await prisma.approvalHistory.findMany({
      where: { requestId: id },
      include: { actor: { select: { id: true, name: true, role: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const serialized = {
      ...decided,
      // Strings end to end, never parsed into a number (DEC-04 / SR-04).
      totalAmount: decided.totalAmount.toFixed(2),
      items: decided.items.map((item) => ({
        ...item,
        amount: item.amount.toFixed(2),
      })),
      history,
    };

    return jsonSuccess({ request: serialized }, 200);
  } catch (error) {
    if (error instanceof AlreadyDecidedError) {
      return jsonError(
        'Only a submitted request can be approved or rejected',
        'INVALID_TRANSITION',
        400
      );
    }
    console.error('Review request error:', error);
    return jsonError('Internal server error', 'INTERNAL_ERROR', 500);
  }
}
