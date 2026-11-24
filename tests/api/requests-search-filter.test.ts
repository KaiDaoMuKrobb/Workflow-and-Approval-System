import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as listRequestsHandler } from '../../src/app/api/requests/route';
import { prisma } from '../../src/lib/prisma';
import { signToken } from '../../src/lib/auth';
import { RequestStatus } from '@prisma/client';

const ExpenseCategory = {
  TRAVEL: 'TRAVEL',
  MEALS: 'MEALS',
  EQUIPMENT: 'EQUIPMENT',
  OFFICE_SUPPLIES: 'OFFICE_SUPPLIES',
  OTHER: 'OTHER',
  SUPPLIES: 'SUPPLIES',
} as const;

describe('Feature F-07: Multi-criteria Filtering, Search & Pagination (FR-08)', () => {
  let aliceId: string;
  let bobId: string;
  let carolId: string;
  let davidId: string;

  let aliceCookie: string;
  let bobCookie: string;
  let carolCookie: string;

  const createdRequestIds: string[] = [];

  beforeAll(async () => {
    const [alice, bob, carol, david] = await Promise.all([
      prisma.user.findUnique({ where: { email: 'alice.req@test.com' } }),
      prisma.user.findUnique({ where: { email: 'bob.req@test.com' } }),
      prisma.user.findUnique({ where: { email: 'carol.rev@test.com' } }),
      prisma.user.findUnique({ where: { email: 'david.both@test.com' } }),
    ]);

    if (!alice || !bob || !carol || !david) {
      throw new Error('Seed users not found. Run npx prisma db seed first.');
    }

    aliceId = alice.id;
    bobId = bob.id;
    carolId = carol.id;
    davidId = david.id;

    aliceCookie = `expense_session=${signToken({
      id: alice.id,
      email: alice.email,
      name: alice.name,
      role: alice.role,
      department: alice.department,
    })}`;

    bobCookie = `expense_session=${signToken({
      id: bob.id,
      email: bob.email,
      name: bob.name,
      role: bob.role,
      department: bob.department,
    })}`;

    carolCookie = `expense_session=${signToken({
      id: carol.id,
      email: carol.email,
      name: carol.name,
      role: carol.role,
      department: carol.department,
    })}`;

    // Create 4 distinct requests for Alice
    const req1 = await prisma.expenseRequest.create({
      data: {
        requestNumber: 'EXP-2026-7001',
        title: 'Client London Conference',
        description: 'Overseas conference travel and lodging',
        status: RequestStatus.DRAFT,
        requesterId: aliceId,
        totalAmount: 1200.0,
        createdAt: new Date('2026-11-05T09:00:00Z'),
        items: {
          create: [{ category: ExpenseCategory.TRAVEL, description: 'Flight to London', amount: 1200.0 }],
        },
      },
    });
    createdRequestIds.push(req1.id);

    const req2 = await prisma.expenseRequest.create({
      data: {
        requestNumber: 'EXP-2026-7002',
        title: 'Quarterly Hardware Server Upgrade',
        description: 'High-performance compute rack and memory',
        status: RequestStatus.SUBMITTED,
        requesterId: aliceId,
        assignedReviewerId: carolId,
        totalAmount: 5000.0,
        createdAt: new Date('2026-11-10T14:30:00Z'),
        items: {
          create: [{ category: ExpenseCategory.EQUIPMENT, description: 'Server Blades', amount: 5000.0 }],
        },
      },
    });
    createdRequestIds.push(req2.id);

    const req3 = await prisma.expenseRequest.create({
      data: {
        requestNumber: 'EXP-2026-7003',
        title: 'Team Building Dinner Celebration',
        description: 'Project milestone dinner',
        status: RequestStatus.APPROVED,
        requesterId: aliceId,
        assignedReviewerId: carolId,
        totalAmount: 450.0,
        createdAt: new Date('2026-11-15T19:00:00Z'),
        items: {
          create: [{ category: ExpenseCategory.MEALS, description: 'Catering dinner', amount: 450.0 }],
        },
      },
    });
    createdRequestIds.push(req3.id);

    const req4 = await prisma.expenseRequest.create({
      data: {
        requestNumber: 'EXP-2026-7004',
        title: 'Office Stationery Supplies Q4',
        description: 'Notebooks, pens and paper',
        status: RequestStatus.REJECTED,
        requesterId: aliceId,
        assignedReviewerId: carolId,
        totalAmount: 150.0,
        createdAt: new Date('2026-11-20T11:00:00Z'),
        items: {
          create: [{ category: ExpenseCategory.OFFICE_SUPPLIES, description: 'Pens and paper', amount: 150.0 }],
        },
      },
    });
    createdRequestIds.push(req4.id);

    // Create 1 distinct request for Bob (for access isolation testing)
    const req5 = await prisma.expenseRequest.create({
      data: {
        requestNumber: 'EXP-2026-7005',
        title: 'Confidential Strategy Offsite Workshop',
        description: 'Sensitive executive planning session',
        status: RequestStatus.SUBMITTED,
        requesterId: bobId,
        assignedReviewerId: carolId,
        totalAmount: 800.0,
        createdAt: new Date('2026-11-12T10:00:00Z'),
        items: {
          create: [{ category: ExpenseCategory.OTHER, description: 'Workshop venue', amount: 800.0 }],
        },
      },
    });
    createdRequestIds.push(req5.id);
  });

  afterAll(async () => {
    if (createdRequestIds.length > 0) {
      await prisma.expenseItem.deleteMany({
        where: { requestId: { in: createdRequestIds } },
      });
      await prisma.expenseRequest.deleteMany({
        where: { id: { in: createdRequestIds } },
      });
    }
  });

  it('TEST-70 / AC-70: filters requests by status accurately', async () => {
    const req = new NextRequest('http://localhost:3000/api/requests?status=SUBMITTED', {
      method: 'GET',
      headers: { cookie: aliceCookie },
    });

    const res = await listRequestsHandler(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data.requests)).toBe(true);
    
    // Every returned request must have status SUBMITTED
    expect(body.data.requests.length).toBeGreaterThanOrEqual(1);
    for (const item of body.data.requests) {
      expect(item.status).toBe('SUBMITTED');
    }
  });

  it('TEST-71 / AC-71: filters requests by line item expense category', async () => {
    const req = new NextRequest('http://localhost:3000/api/requests?category=EQUIPMENT', {
      method: 'GET',
      headers: { cookie: aliceCookie },
    });

    const res = await listRequestsHandler(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.requests.length).toBeGreaterThanOrEqual(1);

    // Must include the Hardware Server Upgrade request
    const found = body.data.requests.find((r: any) => r.requestNumber === 'EXP-2026-7002');
    expect(found).toBeDefined();
    expect(found.title).toContain('Hardware');
    // Ensure line item category matches
    expect(found.items.some((i: any) => i.category === 'EQUIPMENT')).toBe(true);
  });

  it('TEST-72 / AC-72: filters requests within a calendar date range', async () => {
    const req = new NextRequest('http://localhost:3000/api/requests?from=2026-11-09&to=2026-11-16', {
      method: 'GET',
      headers: { cookie: aliceCookie },
    });

    const res = await listRequestsHandler(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);

    // Should include req2 (10 Nov) and req3 (15 Nov), but exclude req1 (5 Nov) and req4 (20 Nov)
    const numbers = body.data.requests.map((r: any) => r.requestNumber);
    expect(numbers).toContain('EXP-2026-7002');
    expect(numbers).toContain('EXP-2026-7003');
    expect(numbers).not.toContain('EXP-2026-7001');
    expect(numbers).not.toContain('EXP-2026-7004');
  });

  it('TEST-73 / AC-73: searches requests by keyword across title, request number, and description', async () => {
    // 1. Search by title keyword
    const reqTitle = new NextRequest('http://localhost:3000/api/requests?search=London', {
      method: 'GET',
      headers: { cookie: aliceCookie },
    });
    const resTitle = await listRequestsHandler(reqTitle);
    const bodyTitle = await resTitle.json();

    expect(resTitle.status).toBe(200);
    expect(bodyTitle.data.requests.some((r: any) => r.requestNumber === 'EXP-2026-7001')).toBe(true);

    // 2. Search by explicit requestNumber
    const reqNum = new NextRequest('http://localhost:3000/api/requests?search=EXP-2026-7003', {
      method: 'GET',
      headers: { cookie: aliceCookie },
    });
    const resNum = await listRequestsHandler(reqNum);
    const bodyNum = await resNum.json();

    expect(resNum.status).toBe(200);
    expect(bodyNum.data.requests).toHaveLength(1);
    expect(bodyNum.data.requests[0].title).toContain('Team Building');
  });

  it('TEST-74 / AC-74: returns sliced records and pagination metadata', async () => {
    const req = new NextRequest('http://localhost:3000/api/requests?page=1&pageSize=2', {
      method: 'GET',
      headers: { cookie: aliceCookie },
    });

    const res = await listRequestsHandler(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.requests).toHaveLength(2);
    expect(body.data.pagination).toBeDefined();
    expect(body.data.pagination.page).toBe(1);
    expect(body.data.pagination.pageSize).toBe(2);
    expect(body.data.pagination.totalCount).toBeGreaterThanOrEqual(4);
    expect(body.data.pagination.totalPages).toBeGreaterThanOrEqual(2);
  });

  it('TEST-75 / AC-75: combines multiple filter and search criteria with AND logic', async () => {
    const req = new NextRequest(
      'http://localhost:3000/api/requests?status=SUBMITTED&category=EQUIPMENT&search=Server',
      {
        method: 'GET',
        headers: { cookie: aliceCookie },
      }
    );

    const res = await listRequestsHandler(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.requests).toHaveLength(1);
    expect(body.data.requests[0].requestNumber).toBe('EXP-2026-7002');
  });

  it('TEST-76 / AC-76: strictly preserves access isolation (BR-05) during search and filtering', async () => {
    // Alice searches for Bob's confidential request keyword
    const req = new NextRequest('http://localhost:3000/api/requests?search=Confidential', {
      method: 'GET',
      headers: { cookie: aliceCookie },
    });

    const res = await listRequestsHandler(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    // Alice must see 0 results (Bob's request must NEVER leak)
    expect(body.data.requests).toHaveLength(0);

    // Carol (assigned reviewer of Bob's request) searches for it and sees it
    const carolReq = new NextRequest('http://localhost:3000/api/requests?search=Confidential', {
      method: 'GET',
      headers: { cookie: carolCookie },
    });
    const carolRes = await listRequestsHandler(carolReq);
    const carolBody = await carolRes.json();

    expect(carolRes.status).toBe(200);
    expect(carolBody.data.requests.some((r: any) => r.requestNumber === 'EXP-2026-7005')).toBe(true);
  });

  it('TEST-77 / AC-77: rejects invalid status or malformed date with HTTP 400 VALIDATION_ERROR', async () => {
    // 1. Invalid status
    const reqStatus = new NextRequest('http://localhost:3000/api/requests?status=BOGUS_STATUS', {
      method: 'GET',
      headers: { cookie: aliceCookie },
    });
    const resStatus = await listRequestsHandler(reqStatus);
    const bodyStatus = await resStatus.json();

    expect(resStatus.status).toBe(400);
    expect(bodyStatus.success).toBe(false);
    expect(bodyStatus.error.code).toBe('VALIDATION_ERROR');

    // 2. Malformed from date
    const reqDate = new NextRequest('http://localhost:3000/api/requests?from=invalid-date', {
      method: 'GET',
      headers: { cookie: aliceCookie },
    });
    const resDate = await listRequestsHandler(reqDate);
    const bodyDate = await resDate.json();

    expect(resDate.status).toBe(400);
    expect(bodyDate.success).toBe(false);
    expect(bodyDate.error.code).toBe('VALIDATION_ERROR');
  });
});
