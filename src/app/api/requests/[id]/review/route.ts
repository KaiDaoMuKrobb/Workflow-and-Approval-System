import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUserFromRequest } from '@/lib/auth';
import { jsonSuccess, jsonError } from '@/lib/api-response';
import { RequestStatus } from '@prisma/client';
import {
  MIN_DECISION_COMMENT_LENGTH,
  DECISION_COMMENT_REQUIRED_MESSAGE,
  MIN_RETURN_COMMENT_LENGTH,
  RETURN_COMMENT_REQUIRED_MESSAGE,
  HIGH_VALUE_THRESHOLD,
} from '@/lib/review-rules';
import { Role } from '@prisma/client';

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

    // Which stage is this, and therefore who is entitled to act. A claim that
    // F-06 escalated belongs to its second reviewer; everything else belongs to
    // the assigned reviewer, exactly as it did in Sprint 1.
    const isSecondStage =
      target.status === RequestStatus.PENDING_SECOND_APPROVAL;
    const entitledReviewerId = isSecondStage
      ? target.secondReviewerId
      : target.assignedReviewerId;

    // Step 4 — BR-05, decide half.
    //
    // This is also where dual control is enforced. The reviewer who granted the
    // first approval is the assigned reviewer, not the second one, so at the
    // second stage they fail here and are told 403 like any other reviewer who
    // is not entitled to act. That is deliberate: DEC-06 fixes 403 ahead of 400,
    // and a DUPLICATE_APPROVER code answered later would be unreachable without
    // reordering the guards for one feature. AC-63 is written against this.
    if (entitledReviewerId !== sessionUser.id) {
      return jsonError(
        isSecondStage
          ? 'Only the second reviewer can decide this request'
          : 'Only the assigned reviewer can decide this request',
        'FORBIDDEN',
        403
      );
    }

    // Step 5 — BR-02. After the permission guards, so a caller without
    // permission never learns whether the request has already been decided.
    if (
      target.status !== RequestStatus.SUBMITTED &&
      target.status !== RequestStatus.PENDING_SECOND_APPROVAL
    ) {
      return jsonError(
        'Only a submitted request, or one awaiting a second approval, can be decided',
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

    if (action !== 'APPROVE' && action !== 'REJECT' && action !== 'RETURN') {
      return jsonError(
        'Action must be APPROVE, REJECT or RETURN',
        'VALIDATION_ERROR',
        400
      );
    }

    // Step 5b. RETURN belongs to the first stage only. F-05 defines it as a way
    // out of SUBMITTED, and a claim that has already collected one approval
    // cannot be sent back for revision without invalidating that approval.
    if (isSecondStage && action === 'RETURN') {
      return jsonError(
        'A request awaiting a second approval cannot be returned for revision',
        'INVALID_TRANSITION',
        400
      );
    }

    const trimmedComment =
      typeof comment === 'string' ? comment.trim() : '';

    // FR-05 in docs/srs.md: a reviewer approves or rejects "with a mandatory
    // comment". Both decisions, not only rejection — the audit trail is the
    // point of the rule, and an approval with no reason is exactly the gap
    // FR-05 exists to close.
    //
    // BR-07 raises the bar for RETURN alone. A returned claim sends work back to
    // its requester, so the reason has to name what needs changing. Approve and
    // reject keep the five character rule FR-05 fixes, and TEST-35 still proves
    // it. The two thresholds are deliberately not merged into one.
    const isReturn = action === 'RETURN';
    const minCommentLength = isReturn
      ? MIN_RETURN_COMMENT_LENGTH
      : MIN_DECISION_COMMENT_LENGTH;

    if (trimmedComment.length < minCommentLength) {
      return jsonError(
        isReturn ? RETURN_COMMENT_REQUIRED_MESSAGE : DECISION_COMMENT_REQUIRED_MESSAGE,
        'VALIDATION_ERROR',
        400
      );
    }

    // Step 6b. BR-09. A first approval of a claim above the threshold does not
    // finish the claim, it escalates it, and an escalation has to name the
    // person it escalates to. The comparison is on the Decimal: SR-04 and DEC-04
    // keep money out of floating point, and this boundary is fixed to the
    // satang, so 50,000.00 takes the single stage path and 50,000.01 does not.
    const needsSecondApproval =
      !isSecondStage &&
      action === 'APPROVE' &&
      target.totalAmount.gt(HIGH_VALUE_THRESHOLD);

    let secondReviewerId: string | null = null;

    if (needsSecondApproval) {
      const { secondReviewerId: named } = (body ?? {}) as {
        secondReviewerId?: unknown;
      };
      const candidateId = typeof named === 'string' ? named.trim() : '';

      if (!candidateId) {
        return jsonError(
          'A claim above the dual control threshold needs a second reviewer named with the first approval',
          'VALIDATION_ERROR',
          400
        );
      }

      // Dual control: the two approvals must come from two people, and neither
      // may be the requester. BR-01 already refused the requester as a caller at
      // step 3; this refuses them as the named second reviewer.
      if (candidateId === sessionUser.id) {
        return jsonError(
          'You cannot name yourself as the second reviewer',
          'VALIDATION_ERROR',
          400
        );
      }

      if (candidateId === target.requesterId) {
        return jsonError(
          'The requester cannot be named as the second reviewer',
          'VALIDATION_ERROR',
          400
        );
      }

      const candidate = await prisma.user.findUnique({
        where: { id: candidateId },
      });

      if (!candidate || candidate.role !== Role.REVIEWER) {
        return jsonError(
          'The second reviewer must hold the REVIEWER role',
          'VALIDATION_ERROR',
          400
        );
      }

      secondReviewerId = candidate.id;
    }

    const nextStatus =
      action === 'REJECT'
        ? RequestStatus.REJECTED
        : action === 'RETURN'
          ? RequestStatus.RETURNED
          : needsSecondApproval
            ? RequestStatus.PENDING_SECOND_APPROVAL
            : RequestStatus.APPROVED;

    // BR-09 asks the trail to say which stage each approval was, so the two are
    // named apart. A single stage approval keeps the plain APPROVE it has always
    // had, which is what TEST-30 and TEST-36 assert.
    const historyAction =
      action !== 'APPROVE'
        ? action
        : needsSecondApproval
          ? 'APPROVE_STAGE_1'
          : isSecondStage
            ? 'APPROVE_STAGE_2'
            : 'APPROVE';

    // Step 7 — the status change and the audit row are one transaction, so a
    // decided request can never exist without the row that explains it.
    //
    // The update repeats the status the caller was authorised against, which
    // steps 4 and 5 already checked. It is read from the record rather than
    // hard coded, because F-06 authorises two of them: SUBMITTED at the first
    // stage and PENDING_SECOND_APPROVAL at the second.
    // Between that read and this write another request could have decided the
    // same claim: two tabs, a double submit, a retry. Without the condition both
    // would succeed and BR-02 would be broken by a second ApprovalHistory row on
    // a request that was already terminal. With it, the loser updates nothing,
    // and `count === 0` is the signal to answer exactly as step 5 would have.
    const decided = await prisma.$transaction(async (tx) => {
      const { count } = await tx.expenseRequest.updateMany({
        where: { id, status: target.status },
        data: {
          status: nextStatus,
          ...(needsSecondApproval ? { secondReviewerId } : {}),
        },
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
          fromStatus: target.status,
          toStatus: nextStatus,
          action: historyAction,
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
        'Only a submitted request, or one awaiting a second approval, can be decided',
        'INVALID_TRANSITION',
        400
      );
    }
    console.error('Review request error:', error);
    return jsonError('Internal server error', 'INTERNAL_ERROR', 500);
  }
}
