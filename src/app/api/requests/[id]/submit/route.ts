import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUserFromRequest } from '@/lib/auth';
import { jsonSuccess, jsonError } from '@/lib/api-response';
import { RequestStatus } from '@prisma/client';

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

    // Guard 4: Entity State Validation (BR-03) -> 400
    if (existingRequest.status !== RequestStatus.DRAFT) {
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

    // Verify reviewer exists
    const reviewer = await prisma.user.findUnique({
      where: { id: assignedReviewerId.trim() },
    });

    if (!reviewer) {
      return jsonError('Assigned reviewer user does not exist', 'VALIDATION_ERROR', 400);
    }

    // DEC-02: Self-assignment (assignedReviewerId == requesterId) is permitted at submit time.
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

      await tx.approvalHistory.create({
        data: {
          requestId: id,
          actorId: sessionUser.id,
          fromStatus: RequestStatus.DRAFT,
          toStatus: RequestStatus.SUBMITTED,
          action: 'SUBMIT',
          comment: 'Request submitted for managerial review',
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
