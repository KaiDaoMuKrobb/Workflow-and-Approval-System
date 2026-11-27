import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUserFromRequest } from '@/lib/auth';
import { jsonSuccess, jsonError } from '@/lib/api-response';
import { RequestStatus, Role } from '@prisma/client';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionUser = getSessionUserFromRequest(req);
    if (!sessionUser) {
      return jsonError('Authentication required', 'UNAUTHENTICATED', 401);
    }

    const { id } = params;

    const existingRequest = await prisma.expenseRequest.findUnique({
      where: { id },
      include: { items: true },
    });

    // Guard 2: Resource Existence & Ownership (DEC-03 / BR-05) -> 404
    if (!existingRequest || existingRequest.requesterId !== sessionUser.id) {
      return jsonError('Request not found', 'NOT_FOUND', 404);
    }

    // Guard 4: Entity State Validation (BR-03, narrowed by BR-08) -> 400
    //
    // RETURNED joins DRAFT here because BR-08 gives a returned claim a way back
    // into review. Everything else is still refused: SUBMITTED is immutable
    // under BR-03, and APPROVED and REJECTED are terminal under BR-02.
    if (
      existingRequest.status !== RequestStatus.DRAFT &&
      existingRequest.status !== RequestStatus.RETURNED
    ) {
      return jsonError(
        'Request has already been submitted or finalized',
        'IMMUTABLE_AFTER_SUBMIT',
        400
      );
    }

    // Must have at least one line item to submit (BR-04)
    if (!existingRequest.items || existingRequest.items.length === 0) {
      return jsonError(
        'Request must have at least one line item to be submitted',
        'VALIDATION_ERROR',
        400
      );
    }

    const body = await req.json();
    const { assignedReviewerId } = body;

    if (!assignedReviewerId || typeof assignedReviewerId !== 'string' || !assignedReviewerId.trim()) {
      return jsonError('Assigned reviewer is required for submission', 'VALIDATION_ERROR', 400);
    }

    // DEC-02 v2.0 (AC-18): a requester cannot name themselves as the reviewer.
    // Checked here, before the reviewer is loaded, so that a REQUESTER who names
    // themselves is told the specific reason instead of the generic role error.
    // Nothing has been written at this point, so the request is left in DRAFT with
    // no ApprovalHistory row. The BR-01 guard at POST /review is a second layer and
    // is unchanged.
    if (assignedReviewerId.trim() === existingRequest.requesterId) {
      return jsonError(
        'You cannot assign this request to yourself. Please choose a different reviewer.',
        'SELF_ASSIGNMENT',
        400
      );
    }

    // Verify reviewer exists and holds REVIEWER role
    const reviewer = await prisma.user.findUnique({
      where: { id: assignedReviewerId.trim() },
    });

    if (!reviewer || reviewer.role !== Role.REVIEWER) {
      return jsonError('Assigned reviewer must hold REVIEWER role', 'VALIDATION_ERROR', 400);
    }

    // Transition status to SUBMITTED and log in ApprovalHistory in a single transaction
    const submittedRequest = await prisma.$transaction(async (tx) => {
      const updated = await tx.expenseRequest.update({
        where: { id },
        data: {
          status: RequestStatus.SUBMITTED,
          assignedReviewerId: reviewer.id,
        },
        include: {
          items: true,
          assignedReviewer: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      // BR-08 requires the trail to show what actually happened. The status the
      // claim came from is read from the record rather than assumed: hard coding
      // DRAFT here would record every resubmission as DRAFT to SUBMITTED and
      // quietly erase the return it followed. TEST-57 asserts both rows.
      const resubmission = existingRequest.status === RequestStatus.RETURNED;

      await tx.approvalHistory.create({
        data: {
          requestId: id,
          actorId: sessionUser.id,
          fromStatus: existingRequest.status,
          toStatus: RequestStatus.SUBMITTED,
          action: resubmission ? 'RESUBMIT' : 'SUBMIT',
          comment: resubmission
            ? 'Request revised and resubmitted for managerial review'
            : 'Request submitted for managerial review',
        },
      });

      return updated;
    });

    const serialized = {
      ...submittedRequest,
      totalAmount: submittedRequest.totalAmount.toFixed(2),
      items: submittedRequest.items.map((i) => ({
        ...i,
        amount: i.amount.toFixed(2),
      })),
    };

    return jsonSuccess({ request: serialized }, 200);
  } catch (error) {
    console.error('Submit request error:', error);
    return jsonError('Internal server error', 'INTERNAL_ERROR', 500);
  }
}

