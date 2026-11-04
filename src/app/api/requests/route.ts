import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUserFromRequest } from '@/lib/auth';
import { jsonSuccess, jsonError } from '@/lib/api-response';
import { generateNextRequestNumber } from '@/lib/request-number';
import { Prisma, RequestStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const sessionUser = getSessionUserFromRequest(req);
    if (!sessionUser) {
      return jsonError('Authentication required', 'UNAUTHENTICATED', 401);
    }

    // Role-adaptive visibility: Requesters see only their own requests
    // Reviewers see assigned requests AND their own requests
    let whereClause: Prisma.ExpenseRequestWhereInput = {
      requesterId: sessionUser.id,
    };

    if (sessionUser.role === 'REVIEWER') {
      whereClause = {
        OR: [
          { requesterId: sessionUser.id },
          { assignedReviewerId: sessionUser.id },
        ],
      };
    }

    const requests = await prisma.expenseRequest.findMany({
      where: whereClause,
      include: {
        items: true,
        requester: {
          select: { id: true, name: true, email: true, department: true },
        },
        assignedReviewer: {
          select: { id: true, name: true, email: true },
        },
        history: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const serializedRequests = requests.map((r) => ({
      ...r,
      totalAmount: r.totalAmount.toFixed(2),
      items: r.items.map((item) => ({
        ...item,
        amount: item.amount.toFixed(2),
      })),
    }));

    return jsonSuccess({ requests: serializedRequests }, 200);
  } catch (error) {
    console.error('List requests error:', error);
    return jsonError('Internal server error', 'INTERNAL_ERROR', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const sessionUser = getSessionUserFromRequest(req);
    if (!sessionUser) {
      return jsonError('Authentication required', 'UNAUTHENTICATED', 401);
    }

    const body = await req.json();
    const { title, description = '', items } = body;

    // Validation: Title required
    if (!title || typeof title !== 'string' || !title.trim()) {
      return jsonError('Title is required', 'VALIDATION_ERROR', 400);
    }

    // Validation: At least one item required (BR-04)
    if (!Array.isArray(items) || items.length === 0) {
      return jsonError('At least one expense line item is required', 'VALIDATION_ERROR', 400);
    }

    // Validate each line item: positive amount (BR-04)
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

    // Create draft request inside a database transaction with concurrency retry (BR-06)
    let newRequest;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        newRequest = await prisma.$transaction(async (tx) => {
          const requestNumber = await generateNextRequestNumber(tx);

          return tx.expenseRequest.create({
            data: {
              requestNumber,
              title: title.trim(),
              description: String(description).trim(),
              totalAmount: calculatedTotal,
              status: RequestStatus.DRAFT,
              requesterId: sessionUser.id,
              items: {
                create: validItems,
              },
            },
            include: {
              items: true,
            },
          });
        });
        break;
      } catch (err: any) {
        if (err?.code === 'P2002' && attempt < 3) {
          continue;
        }
        throw err;
      }
    }

    if (!newRequest) {
      return jsonError('Failed to allocate unique request number', 'INTERNAL_ERROR', 500);
    }

    const serialized = {
      ...newRequest,
      totalAmount: newRequest.totalAmount.toFixed(2),
      items: newRequest.items.map((item) => ({
        ...item,
        amount: item.amount.toFixed(2),
      })),
    };

    return jsonSuccess({ request: serialized }, 201);
  } catch (error) {
    console.error('Create request error:', error);
    return jsonError('Internal server error', 'INTERNAL_ERROR', 500);
  }
}
