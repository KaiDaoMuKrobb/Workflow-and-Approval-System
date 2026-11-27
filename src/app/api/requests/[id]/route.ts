import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUserFromRequest } from '@/lib/auth';
import { jsonSuccess, jsonError } from '@/lib/api-response';
import { canViewRequest } from '@/lib/authorization';
import { Prisma, RequestStatus } from '@prisma/client';
import { MAX_SINGLE_ITEM_AMOUNT, SINGLE_ITEM_CAP_MESSAGE } from '@/lib/review-rules';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionUser = getSessionUserFromRequest(req);
    if (!sessionUser) {
      return jsonError('Authentication required', 'UNAUTHENTICATED', 401);
    }

    const { id } = params;

    const request = await prisma.expenseRequest.findUnique({
      where: { id },
      include: {
        items: true,
        requester: {
          select: { id: true, name: true, email: true, department: true },
        },
        assignedReviewer: {
          select: { id: true, name: true, email: true },
        },
        // F-06. The detail page names the reviewer a high value claim was
        // escalated to, and canViewRequest already admits them, so the record
        // has to carry them as well as the first reviewer.
        secondReviewer: {
          select: { id: true, name: true, email: true },
        },
        history: {
          include: {
            actor: {
              select: { id: true, name: true, role: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    // Zero-knowledge access control (DEC-03 / BR-05): 404 for unauthorized view.
    // The rule itself lives in src/lib/authorization.ts so that this handler and
    // the decision endpoint cannot answer AC-26 and AC-34 differently.
    if (!canViewRequest(request, sessionUser.id)) {
      return jsonError('Request not found', 'NOT_FOUND', 404);
    }

    const serialized = {
      ...request,
      totalAmount: request.totalAmount.toFixed(2),
      items: request.items.map((item) => ({
        ...item,
        amount: item.amount.toFixed(2),
      })),
    };

    return jsonSuccess({ request: serialized }, 200);
  } catch (error) {
    console.error('Get request detail error:', error);
    return jsonError('Internal server error', 'INTERNAL_ERROR', 500);
  }
}

export async function PUT(
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
    // BR-03 is narrowed, not removed. A SUBMITTED claim is still immutable and
    // TEST-15 proves it unchanged. A RETURNED claim is editable because BR-08
    // asks its requester to correct it, and both write paths below, the items
    // replacement and the header only update, are reached through this guard.
    if (
      existingRequest.status !== RequestStatus.DRAFT &&
      existingRequest.status !== RequestStatus.RETURNED
    ) {
      return jsonError(
        'Request cannot be edited after submission',
        'IMMUTABLE_AFTER_SUBMIT',
        400
      );
    }

    const body = await req.json();
    const { title, description, items } = body;

    let updateData: Prisma.ExpenseRequestUpdateInput = {};

    if (typeof title !== 'undefined') {
      if (!title || typeof title !== 'string' || !title.trim()) {
        return jsonError('Title cannot be empty', 'VALIDATION_ERROR', 400);
      }
      updateData.title = title.trim();
    }

    if (typeof description !== 'undefined') {
      updateData.description = String(description).trim();
    }

    // Process line items update if provided
    if (typeof items !== 'undefined') {
      if (!Array.isArray(items) || items.length === 0) {
        return jsonError('At least one expense line item is required', 'VALIDATION_ERROR', 400);
      }

      let calculatedTotal = new Prisma.Decimal(0);
      const validItems: Array<{ category: string; description: string; amount: Prisma.Decimal }> = [];

      for (const item of items) {
        if (!item || !item.category || typeof item.amount === 'undefined') {
          return jsonError('Each line item must have a category and amount', 'VALIDATION_ERROR', 400);
        }

        let decimalAmount: Prisma.Decimal;
        try {
          decimalAmount = new Prisma.Decimal(item.amount);
        } catch {
          return jsonError('Invalid item amount format', 'VALIDATION_ERROR', 400);
        }

        if (decimalAmount.lte(0)) {
          return jsonError('Line item amount must be strictly greater than zero', 'VALIDATION_ERROR', 400);
        }

        if (decimalAmount.gt(MAX_SINGLE_ITEM_AMOUNT)) {
          return jsonError(SINGLE_ITEM_CAP_MESSAGE, 'VALIDATION_ERROR', 400);
        }

        calculatedTotal = calculatedTotal.plus(decimalAmount);
        validItems.push({
          category: String(item.category).toUpperCase(),
          description: item.description ? String(item.description).trim() : '',
          amount: decimalAmount,
        });
      }

      // Execute update and item replacement in a transaction
      const updated = await prisma.$transaction(async (tx) => {
        // Delete old items
        await tx.expenseItem.deleteMany({
          where: { requestId: id },
        });

        // Update header and insert new items
        return tx.expenseRequest.update({
          where: { id },
          data: {
            ...updateData,
            totalAmount: calculatedTotal,
            items: {
              create: validItems,
            },
          },
          include: {
            items: true,
          },
        });
      });

      const serialized = {
        ...updated,
        totalAmount: updated.totalAmount.toFixed(2),
        items: updated.items.map((i) => ({
          ...i,
          amount: i.amount.toFixed(2),
        })),
      };

      return jsonSuccess({ request: serialized }, 200);
    }

    // Only header fields updated without items replacement
    const updated = await prisma.expenseRequest.update({
      where: { id },
      data: updateData,
      include: { items: true },
    });

    const serialized = {
      ...updated,
      totalAmount: updated.totalAmount.toFixed(2),
      items: updated.items.map((i) => ({
        ...i,
        amount: i.amount.toFixed(2),
      })),
    };

    return jsonSuccess({ request: serialized }, 200);
  } catch (error) {
    console.error('Update request error:', error);
    return jsonError('Internal server error', 'INTERNAL_ERROR', 500);
  }
}
