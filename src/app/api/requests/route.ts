import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUserFromRequest } from '@/lib/auth';
import { jsonSuccess, jsonError } from '@/lib/api-response';
import { generateNextRequestNumber } from '@/lib/request-number';
import { Prisma, RequestStatus } from '@prisma/client';
import {
  MAX_SINGLE_ITEM_AMOUNT,
  SINGLE_ITEM_CAP_MESSAGE,
  VALID_EXPENSE_CATEGORIES,
} from '@/lib/review-rules';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const sessionUser = getSessionUserFromRequest(req);
    if (!sessionUser) {
      return jsonError('Authentication required', 'UNAUTHENTICATED', 401);
    }

    // Parse query parameters
    const searchParams = req.nextUrl.searchParams;
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const page = searchParams.get('page');
    const pageSize = searchParams.get('pageSize');
    const isQueueView = searchParams.get('queue') === 'true';

    // Validation: status
    const validStatuses = Object.values(RequestStatus);
    if (status && !validStatuses.includes(status as RequestStatus)) {
      return jsonError(
        'Invalid query parameters: status must be a recognized RequestStatus',
        'VALIDATION_ERROR',
        400
      );
    }

    // Validation: expense category
    if (category) {
      const normalizedCat = category.trim().toUpperCase();
      if (!VALID_EXPENSE_CATEGORIES.includes(normalizedCat as any)) {
        return jsonError(
          'Invalid query parameters: category must be a recognized ExpenseCategory',
          'VALIDATION_ERROR',
          400
        );
      }
    }

    // Validation: date range
    let fromDate: Date | undefined;
    let toDate: Date | undefined;
    if (from) {
      const parsedFrom = new Date(from.includes('T') ? from : `${from}T00:00:00.000Z`);
      if (isNaN(parsedFrom.getTime())) {
        return jsonError('Invalid query parameters: malformed date filter', 'VALIDATION_ERROR', 400);
      }
      fromDate = parsedFrom;
    }
    if (to) {
      const parsedTo = new Date(to.includes('T') ? to : `${to}T23:59:59.999Z`);
      if (isNaN(parsedTo.getTime())) {
        return jsonError('Invalid query parameters: malformed date filter', 'VALIDATION_ERROR', 400);
      }
      toDate = parsedTo;
    }
    if (fromDate && toDate && fromDate > toDate) {
      return jsonError(
        'Invalid query parameters: "from" date must be earlier than or equal to "to" date',
        'VALIDATION_ERROR',
        400
      );
    }

    // Pagination validation: positive integer or default
    let pageNum = 1;
    let pageSizeNum = 10;
    if (page !== null && page !== undefined && page !== '') {
      const parsedPage = Number(page);
      if (!Number.isInteger(parsedPage) || parsedPage < 1) {
        return jsonError('Invalid query parameters: page must be an integer >= 1', 'VALIDATION_ERROR', 400);
      }
      pageNum = parsedPage;
    }
    if (pageSize !== null && pageSize !== undefined && pageSize !== '') {
      const parsedPageSize = Number(pageSize);
      if (!Number.isInteger(parsedPageSize) || parsedPageSize < 1) {
        return jsonError('Invalid query parameters: pageSize must be an integer >= 1', 'VALIDATION_ERROR', 400);
      }
      pageSizeNum = Math.min(parsedPageSize, 100);
    }

    // Base visibility logic (BR-05)
    let baseVisibility: Prisma.ExpenseRequestWhereInput;
    if (isQueueView) {
      // Reviewer queue view: submitted claims assigned to this reviewer, not raised by them
      if (sessionUser.role === 'REVIEWER') {
        baseVisibility = {
          assignedReviewerId: sessionUser.id,
          requesterId: { not: sessionUser.id },
          status: RequestStatus.SUBMITTED,
        };
      } else {
        baseVisibility = { requesterId: 'none' }; // Requesters have no review queue
      }
    } else {
      // General list view
      baseVisibility =
        sessionUser.role === 'REVIEWER'
          ? {
              OR: [
                { requesterId: sessionUser.id },
                { assignedReviewerId: sessionUser.id },
              ],
            }
          : {
              requesterId: sessionUser.id,
            };
    }

    const andConditions: Prisma.ExpenseRequestWhereInput[] = [baseVisibility];

    if (status) {
      andConditions.push({ status: status as RequestStatus });
    }

    if (category && category.trim()) {
      andConditions.push({
        items: {
          some: {
            category: {
              equals: category.trim().toUpperCase(),
              mode: 'insensitive',
            },
          },
        },
      });
    }

    if (fromDate || toDate) {
      const createdAtFilter: Prisma.DateTimeFilter = {};
      if (fromDate) createdAtFilter.gte = fromDate;
      if (toDate) createdAtFilter.lte = toDate;
      andConditions.push({ createdAt: createdAtFilter });
    }

    if (search && search.trim()) {
      const term = search.trim();
      andConditions.push({
        OR: [
          { title: { contains: term, mode: 'insensitive' } },
          { description: { contains: term, mode: 'insensitive' } },
          { requestNumber: { contains: term, mode: 'insensitive' } },
          { requester: { name: { contains: term, mode: 'insensitive' } } },
        ],
      });
    }

    const whereClause: Prisma.ExpenseRequestWhereInput = {
      AND: andConditions,
    };

    const [requests, totalCount, statusCountsRaw] = await Promise.all([
      prisma.expenseRequest.findMany({
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
        skip: (pageNum - 1) * pageSizeNum,
        take: pageSizeNum,
      }),
      prisma.expenseRequest.count({
        where: whereClause,
      }),
      prisma.expenseRequest.groupBy({
        by: ['status'],
        where: isQueueView && sessionUser.role === 'REVIEWER'
          ? { assignedReviewerId: sessionUser.id, requesterId: { not: sessionUser.id }, status: RequestStatus.SUBMITTED }
          : { requesterId: sessionUser.id },
        _count: { _all: true },
      }),
    ]);

    const stats = {
      drafts: 0,
      submitted: 0,
      approved: 0,
      rejected: 0,
      returned: 0,
    };
    for (const row of statusCountsRaw) {
      if (row.status === RequestStatus.DRAFT) stats.drafts = row._count._all;
      if (row.status === RequestStatus.SUBMITTED) stats.submitted = row._count._all;
      if (row.status === RequestStatus.APPROVED) stats.approved = row._count._all;
      if (row.status === RequestStatus.REJECTED) stats.rejected = row._count._all;
      if (row.status === RequestStatus.RETURNED) stats.returned = row._count._all;
    }

    const serializedRequests = requests.map((r) => ({
      ...r,
      totalAmount: r.totalAmount.toFixed(2),
      items: r.items.map((item) => ({
        ...item,
        amount: item.amount.toFixed(2),
      })),
    }));

    return jsonSuccess(
      {
        requests: serializedRequests,
        pagination: {
          page: pageNum,
          pageSize: pageSizeNum,
          totalCount,
          totalPages: totalCount === 0 ? 0 : Math.ceil(totalCount / pageSizeNum),
        },
        stats,
      },
      200
    );
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
