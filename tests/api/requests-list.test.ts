import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as listHandler } from '../../src/app/api/requests/route';
import { prisma } from '../../src/lib/prisma';
import { signToken } from '../../src/lib/auth';
import { Prisma, RequestStatus, Role } from '@prisma/client';

/**
 * F-03 — the read half of BR-05, list path.
 *
 * The handler itself shipped with F-02 because its own screens needed it. These
 * criteria own the reviewer visibility rules over that handler: AC-20 to AC-23.
 *
 * Every assertion is about whether a named fixture request is present, never about
 * the size of the list. Vitest runs test files in parallel and F-02's TEST-16 also
 * assigns a request to Carol, so a length assertion would depend on scheduling.
 */
describe('Feature F-03: Reviewer list visibility (AC-20..AC-23)', () => {
  const TAG = `F03-LIST-${Date.now()}`;

  let aliceId: string;
  let bobId: string;
  let carolId: string;
  let davidId: string;

  let carolCookie: string;

  // Alice -> Carol, SUBMITTED. Carol must see it (AC-20).
  let assignedToCarol: string;
  // Bob -> David, SUBMITTED. Carol must not see it (AC-21).
  let assignedToDavid: string;
  // Raised by Carol herself. Must also appear for her (AC-22).
  let raisedByCarol: string;

  const createdIds: string[] = [];

  async function makeRequest(opts: {
    requesterId: string;
    assignedReviewerId: string | null;
    status: RequestStatus;
    suffix: string;
  }) {
    const created = await prisma.expenseRequest.create({
      data: {
        requestNumber: `${TAG}-${opts.suffix}`,
        title: `${TAG} ${opts.suffix}`,
        description: 'Fixture created by the F-03 list suite',
        totalAmount: new Prisma.Decimal('1500.00'),
        status: opts.status,
        requesterId: opts.requesterId,
        assignedReviewerId: opts.assignedReviewerId,
        items: {
          create: [
            { category: 'TRAVEL', description: 'Taxi both ways', amount: new Prisma.Decimal('850.00') },
            { category: 'MEALS', description: 'Client meal', amount: new Prisma.Decimal('650.00') },
          ],
        },
      },
    });
    createdIds.push(created.id);
    return created.requestNumber;
  }

  function call(cookie?: string) {
    return listHandler(
      new NextRequest('http://localhost:3000/api/requests', {
        method: 'GET',
        ...(cookie ? { headers: { cookie } } : {}),
      })
    );
  }

  beforeAll(async () => {
    const [alice, bob, carol, david] = await Promise.all([
      prisma.user.findUnique({ where: { email: 'alice.req@test.com' } }),
      prisma.user.findUnique({ where: { email: 'bob.req@test.com' } }),
      prisma.user.findUnique({ where: { email: 'carol.rev@test.com' } }),
      prisma.user.findUnique({ where: { email: 'david.both@test.com' } }),
    ]);

    if (!alice || !bob || !carol || !david) {
      throw new Error('Seed users not found. Run `npx prisma db seed` first.');
    }

    aliceId = alice.id;
    bobId = bob.id;
    carolId = carol.id;
    davidId = david.id;

    carolCookie = `expense_session=${signToken({
      id: carol.id,
      email: carol.email,
      name: carol.name,
      role: carol.role,
      department: carol.department,
    })}`;

    assignedToCarol = await makeRequest({
      requesterId: aliceId,
      assignedReviewerId: carolId,
      status: RequestStatus.SUBMITTED,
      suffix: 'ALICE-TO-CAROL',
    });
    assignedToDavid = await makeRequest({
      requesterId: bobId,
      assignedReviewerId: davidId,
      status: RequestStatus.SUBMITTED,
      suffix: 'BOB-TO-DAVID',
    });
    raisedByCarol = await makeRequest({
      requesterId: carolId,
      assignedReviewerId: null,
      status: RequestStatus.DRAFT,
      suffix: 'CAROL-OWN',
    });

    // Carol must genuinely hold the reviewer role, or AC-20 would pass for the
    // wrong reason: the requester branch of the query would be the one answering.
    expect(carol.role).toBe(Role.REVIEWER);
  });

  afterAll(async () => {
    await prisma.approvalHistory.deleteMany({ where: { requestId: { in: createdIds } } });
    await prisma.expenseItem.deleteMany({ where: { requestId: { in: createdIds } } });
    await prisma.expenseRequest.deleteMany({ where: { id: { in: createdIds } } });
    await prisma.$disconnect();
  });

  it('TEST-20 / AC-20: a reviewer sees a SUBMITTED request assigned to them', async () => {
    const res = await call(carolCookie);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);

    const numbers = body.data.requests.map((r: { requestNumber: string }) => r.requestNumber);
    expect(numbers).toContain(assignedToCarol);
  });

  it('TEST-21 / AC-21: a reviewer does not see a request assigned to a different reviewer', async () => {
    const res = await call(carolCookie);
    const body = await res.json();

    expect(res.status).toBe(200);

    const numbers = body.data.requests.map((r: { requestNumber: string }) => r.requestNumber);
    expect(numbers).not.toContain(assignedToDavid);
  });

  it('TEST-22 / AC-22: a reviewer sees both their own request and one assigned to them', async () => {
    const res = await call(carolCookie);
    const body = await res.json();

    expect(res.status).toBe(200);

    const numbers = body.data.requests.map((r: { requestNumber: string }) => r.requestNumber);
    expect(numbers).toContain(assignedToCarol);
    expect(numbers).toContain(raisedByCarol);
  });

  it('TEST-23 / AC-23: without a session the list returns 401 and carries no request data', async () => {
    const res = await call();
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('UNAUTHENTICATED');
    expect(body.data).toBeUndefined();
    expect(JSON.stringify(body)).not.toContain(TAG);
  });

  it('TEST-29 / AC-29 (NFR-03): the list answers within 500 ms after one warm-up call', async () => {
    await call(carolCookie); // warm-up: connection pool, query plan, Prisma engine

    const startedAt = performance.now();
    const res = await call(carolCookie);
    await res.json();
    const elapsedMs = performance.now() - startedAt;

    expect(res.status).toBe(200);
    expect(elapsedMs).toBeLessThan(500);
  });

  it('TEST-20b: the list serialises money as a string, never a number (DEC-04 / SR-04)', async () => {
    const res = await call(carolCookie);
    const body = await res.json();

    const fixture = body.data.requests.find(
      (r: { requestNumber: string }) => r.requestNumber === assignedToCarol
    );

    expect(fixture).toBeDefined();
    expect(typeof fixture.totalAmount).toBe('string');
    expect(fixture.totalAmount).toBe('1500.00');
    for (const item of fixture.items) {
      expect(typeof item.amount).toBe('string');
    }
  });
});
