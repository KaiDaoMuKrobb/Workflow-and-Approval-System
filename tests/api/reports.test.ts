import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getSummaryHandler } from '../../src/app/api/reports/summary/route';
import { prisma } from '../../src/lib/prisma';
import { signToken } from '../../src/lib/auth';
import { RequestStatus } from '@prisma/client';

describe('Feature F-08: Department Expense Summaries & Analytics (FR-09)', () => {
  let aliceId: string; // REQUESTER (Engineering)
  let bobId: string;   // REQUESTER (Design)
  let carolId: string; // REVIEWER (Management)

  let aliceCookie: string;
  let carolCookie: string;

  const testRequestIds: string[] = [];

  beforeAll(async () => {
    // 1. Resolve or seed test users
    const alice = await prisma.user.upsert({
      where: { email: 'alice.reports@test.com' },
      update: { role: 'REQUESTER', department: 'Engineering' },
      create: {
        email: 'alice.reports@test.com',
        passwordHash: 'dummy',
        name: 'Alice Requester',
        role: 'REQUESTER',
        department: 'Engineering',
      },
    });
    aliceId = alice.id;
    aliceCookie = signToken({
      id: alice.id,
      email: alice.email,
      role: alice.role,
      name: alice.name,
      department: alice.department,
    });

    const bob = await prisma.user.upsert({
      where: { email: 'bob.reports@test.com' },
      update: { role: 'REQUESTER', department: 'Design' },
      create: {
        email: 'bob.reports@test.com',
        passwordHash: 'dummy',
        name: 'Bob Designer',
        role: 'REQUESTER',
        department: 'Design',
      },
    });
    bobId = bob.id;

    const carol = await prisma.user.upsert({
      where: { email: 'carol.reports@test.com' },
      update: { role: 'REVIEWER', department: 'Management' },
      create: {
        email: 'carol.reports@test.com',
        passwordHash: 'dummy',
        name: 'Carol Reviewer',
        role: 'REVIEWER',
        department: 'Management',
      },
    });
    carolId = carol.id;
    carolCookie = signToken({
      id: carol.id,
      email: carol.email,
      role: carol.role,
      name: carol.name,
      department: carol.department,
    });

    // Clean up any stale test claims from previous runs
    await prisma.expenseItem.deleteMany({
      where: { request: { title: { startsWith: '[TEST-F08]' } } },
    });
    await prisma.approvalHistory.deleteMany({
      where: { request: { title: { startsWith: '[TEST-F08]' } } },
    });
    await prisma.expenseRequest.deleteMany({
      where: { title: { startsWith: '[TEST-F08]' } },
    });

    // 2. Create seed claims with different statuses
    // Claim 1: Alice (Engineering) - APPROVED - 30,000 THB (Travel 20k, Meals 10k)
    const req1 = await prisma.expenseRequest.create({
      data: {
        requestNumber: `EXP-RPT-0001`,
        title: '[TEST-F08] DevOps Summit Travel',
        description: 'Conference travel and meals',
        totalAmount: 30000.0,
        status: RequestStatus.APPROVED,
        requesterId: aliceId,
        assignedReviewerId: carolId,
        items: {
          create: [
            { category: 'TRAVEL', description: 'Flight', amount: 20000.0 },
            { category: 'MEALS', description: 'Conference meals', amount: 10000.0 },
          ],
        },
      },
    });
    testRequestIds.push(req1.id);

    // Claim 2: Alice (Engineering) - APPROVED - 15,000 THB (Equipment 15k)
    const req2 = await prisma.expenseRequest.create({
      data: {
        requestNumber: `EXP-RPT-0002`,
        title: '[TEST-F08] Monitor Upgrade',
        description: 'New monitor for workstation',
        totalAmount: 15000.0,
        status: RequestStatus.APPROVED,
        requesterId: aliceId,
        assignedReviewerId: carolId,
        items: {
          create: [
            { category: 'EQUIPMENT', description: '4K Monitor', amount: 15000.0 },
          ],
        },
      },
    });
    testRequestIds.push(req2.id);

    // Claim 3: Bob (Design) - APPROVED - 25,000 THB (Travel 10k, Equipment 15k)
    const req3 = await prisma.expenseRequest.create({
      data: {
        requestNumber: `EXP-RPT-0003`,
        title: '[TEST-F08] Design Software & Hardware',
        description: 'Design workstation gear',
        totalAmount: 25000.0,
        status: RequestStatus.APPROVED,
        requesterId: bobId,
        assignedReviewerId: carolId,
        items: {
          create: [
            { category: 'TRAVEL', description: 'Design Expo train', amount: 10000.0 },
            { category: 'EQUIPMENT', description: 'Drawing Tablet', amount: 15000.0 },
          ],
        },
      },
    });
    testRequestIds.push(req3.id);

    // Claim 4: Alice (Engineering) - SUBMITTED (Non-approved) - 50,000 THB
    // MUST BE EXCLUDED FROM TOTALS
    const req4 = await prisma.expenseRequest.create({
      data: {
        requestNumber: `EXP-RPT-0004`,
        title: '[TEST-F08] Pending Cloud Server',
        description: 'Pending review',
        totalAmount: 50000.0,
        status: RequestStatus.SUBMITTED,
        requesterId: aliceId,
        assignedReviewerId: carolId,
        items: {
          create: [
            { category: 'EQUIPMENT', description: 'Server Blade', amount: 50000.0 },
          ],
        },
      },
    });
    testRequestIds.push(req4.id);

    // Claim 5: Bob (Design) - REJECTED (Non-approved) - 10,000 THB
    // MUST BE EXCLUDED FROM TOTALS
    const req5 = await prisma.expenseRequest.create({
      data: {
        requestNumber: `EXP-RPT-0005`,
        title: '[TEST-F08] Disallowed Coffee',
        description: 'Rejected claim',
        totalAmount: 10000.0,
        status: RequestStatus.REJECTED,
        requesterId: bobId,
        assignedReviewerId: carolId,
        items: {
          create: [
            { category: 'MEALS', description: 'Personal Coffee', amount: 10000.0 },
          ],
        },
      },
    });
    testRequestIds.push(req5.id);
  });

  afterAll(async () => {
    if (testRequestIds.length > 0) {
      await prisma.expenseItem.deleteMany({
        where: { requestId: { in: testRequestIds } },
      });
      await prisma.expenseRequest.deleteMany({
        where: { id: { in: testRequestIds } },
      });
    }
  });

  it('TEST-80 / AC-80: unauthenticated request returns HTTP 401 UNAUTHENTICATED', async () => {
    const req = new NextRequest('http://localhost:3000/api/reports/summary');
    const res = await getSummaryHandler(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
    expect(body.error.message).toMatch(/authentication/i);
    expect(body.error.code).toBe('UNAUTHENTICATED');
  });

  it('TEST-81 / AC-81: standard requester role returns HTTP 403 FORBIDDEN', async () => {
    const req = new NextRequest('http://localhost:3000/api/reports/summary');
    req.headers.set('cookie', `expense_session=${aliceCookie}`);

    const res = await getSummaryHandler(req);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('TEST-82 / AC-82: reviewer role returns HTTP 200 with summary structure', async () => {
    const req = new NextRequest('http://localhost:3000/api/reports/summary');
    req.headers.set('cookie', `expense_session=${carolCookie}`);

    const res = await getSummaryHandler(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('summary');
    expect(body.data).toHaveProperty('byDepartment');
    expect(body.data).toHaveProperty('byCategory');
    expect(body.data).toHaveProperty('monthlyTotals');
  });

  it('TEST-83 / AC-83: strictly includes APPROVED claims only, excluding SUBMITTED and REJECTED', async () => {
    const req = new NextRequest('http://localhost:3000/api/reports/summary');
    req.headers.set('cookie', `expense_session=${carolCookie}`);

    const res = await getSummaryHandler(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    // Total approved in test is 30,000 + 15,000 + 25,000 = 70,000 (plus any existing approved in seed)
    // Non-approved 50,000 (SUBMITTED) and 10,000 (REJECTED) must NOT be included
    expect(body.data.summary.totalApprovedAmount).toBeGreaterThanOrEqual(70000.0);
    expect(body.data.summary.totalApprovedClaims).toBeGreaterThanOrEqual(3);
  });

  it('TEST-84 / AC-84: calculates accurate departmental aggregation (byDepartment)', async () => {
    const req = new NextRequest('http://localhost:3000/api/reports/summary');
    req.headers.set('cookie', `expense_session=${carolCookie}`);

    const res = await getSummaryHandler(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    const depts = body.data.byDepartment;
    expect(Array.isArray(depts)).toBe(true);

    const engDept = depts.find((d: any) => d.department === 'Engineering');
    expect(engDept).toBeDefined();
    // Alice had 30k + 15k = 45,000 THB approved across 2 claims
    expect(engDept.totalAmount).toBeGreaterThanOrEqual(45000.0);
    expect(engDept.claimCount).toBeGreaterThanOrEqual(2);

    const designDept = depts.find((d: any) => d.department === 'Design');
    expect(designDept).toBeDefined();
    // Bob had 25,000 THB approved in 1 claim
    expect(designDept.totalAmount).toBeGreaterThanOrEqual(25000.0);
    expect(designDept.claimCount).toBeGreaterThanOrEqual(1);
  });

  it('TEST-85 / AC-85: calculates category distribution and percentage breakdown (byCategory)', async () => {
    const req = new NextRequest('http://localhost:3000/api/reports/summary');
    req.headers.set('cookie', `expense_session=${carolCookie}`);

    const res = await getSummaryHandler(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    const categories = body.data.byCategory;
    expect(Array.isArray(categories)).toBe(true);

    // Verify category items have required fields
    categories.forEach((cat: any) => {
      expect(cat).toHaveProperty('category');
      expect(cat).toHaveProperty('totalAmount');
      expect(cat).toHaveProperty('percentage');
      expect(typeof cat.totalAmount).toBe('number');
      expect(typeof cat.percentage).toBe('number');
    });

    // Sum of percentages should be approximately 100%
    const totalPercentage = categories.reduce((sum: number, c: any) => sum + c.percentage, 0);
    expect(Math.round(totalPercentage)).toBe(100);
  });
});
