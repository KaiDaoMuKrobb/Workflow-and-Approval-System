import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUserFromRequest } from '@/lib/auth';
import { jsonSuccess, jsonError } from '@/lib/api-response';
import { Prisma, RequestStatus } from '@prisma/client';

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

    // Zero-knowledge access control (DEC-03 / BR-05): 404 for unauthorized view
    if (
      !request ||
      (request.requesterId !== sessionUser.id &&
        request.assignedReviewerId !== sessionUser.id)
    ) {
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

    // Guard 4: Entity State Validation (BR-03: Immutable After Submit) -> 400
    if (existingRequest.status !== RequestStatus.DRAFT) {
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
