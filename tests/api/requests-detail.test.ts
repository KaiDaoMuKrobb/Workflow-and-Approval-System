import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as detailHandler } from '../../src/app/api/requests/[id]/route';
import { prisma } from '../../src/lib/prisma';
import { signToken } from '../../src/lib/auth';
import { Prisma, RequestStatus } from '@prisma/client';

/**
 * F-03 — the read half of BR-05, detail path: AC-24 to AC-27.
 *
 * AC-26 and AC-27 are the point of this file. A reviewer who is not assigned must
 * receive exactly what a caller asking for a row that does not exist receives.
 * Any difference between the two, even in the message, confirms the row exists,
 * which is what DEC-03 is written to prevent.
 */
describe('Feature F-03: Request detail access isolation (AC-24..AC-27)', () => {
  const TAG = `F03-DETAIL-${Date.now()}`;
  const ABSENT_ID = '00000000-0000-4000-8000-000000000000';

  let aliceCookie: string;
  let carolCookie: string;
  let davidCookie: string;

  let requestId: string;
  const createdIds: string[] = [];

  function call(id: string, cookie?: string) {
    return detailHandler(
      new NextRequest(`http://localhost:3000/api/requests/${id}`, {
        method: 'GET',
        ...(cookie ? { headers: { cookie } } : {}),
      }),
      { params: { id } }
    );
  }

  const cookieFor = (u: {
    id: string;
    email: string;
    name: string;
    role: 'REQUESTER' | 'REVIEWER';
    department: string;
  }) => `expense_session=${signToken(u)}`;

  beforeAll(async () => {
    const [alice, carol, david] = await Promise.all([
      prisma.user.findUnique({ where: { email: 'alice.req@test.com' } }),
      prisma.user.findUnique({ where: { email: 'carol.rev@test.com' } }),
      prisma.user.findUnique({ where: { email: 'david.both@test.com' } }),
    ]);

    if (!alice || !carol || !david) {
      throw new Error('Seed users not found. Run `npx prisma db seed` first.');
    }

    aliceCookie = cookieFor(alice);
    carolCookie = cookieFor(carol);
    davidCookie = cookieFor(david);

    // Alice raises it, Carol is assigned. David is a reviewer but unrelated to it.
    const created = await prisma.expenseRequest.create({
      data: {
        requestNumber: `${TAG}-SUBJECT`,
        title: `${TAG} subject`,
        description: 'Fixture created by the F-03 detail suite',
        totalAmount: new Prisma.Decimal('1500.00'),
        status: RequestStatus.SUBMITTED,
        requesterId: alice.id,
        assignedReviewerId: carol.id,
        items: {
          create: [
            { category: 'TRAVEL', description: 'Taxi both ways', amount: new Prisma.Decimal('850.00') },
            { category: 'MEALS', description: 'Client meal', amount: new Prisma.Decimal('650.00') },
          ],
        },
        history: {
          create: [
            {
              actorId: alice.id,
              fromStatus: RequestStatus.DRAFT,
              toStatus: RequestStatus.SUBMITTED,
              action: 'SUBMIT',
              comment: 'Request submitted for managerial review',
            },
          ],
        },
      },
    });

    requestId = created.id;
    createdIds.push(created.id);
  });

  afterAll(async () => {
    await prisma.approvalHistory.deleteMany({ where: { requestId: { in: createdIds } } });
    await prisma.expenseItem.deleteMany({ where: { requestId: { in: createdIds } } });
    await prisma.expenseRequest.deleteMany({ where: { id: { in: createdIds } } });
    await prisma.$disconnect();
  });

  it('TEST-24 / AC-24: the assigned reviewer gets 200 with items and history present', async () => {
    const res = await call(requestId, carolCookie);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.request.id).toBe(requestId);
    expect(body.data.request.items.length).toBeGreaterThanOrEqual(1);
    expect(body.data.request.history.length).toBeGreaterThanOrEqual(1);
    expect(body.data.request.history[0].action).toBe('SUBMIT');
  });

  it('TEST-25 / AC-25: the owner gets 200 for their own request', async () => {
    const res = await call(requestId, aliceCookie);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.request.id).toBe(requestId);
  });

  it('TEST-26 / AC-26: an unassigned reviewer gets 404 NOT_FOUND, not 403', async () => {
    const res = await call(requestId, davidCookie);
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(res.status).not.toBe(403);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('TEST-27 / AC-27: a non-existent id answers identically to an unauthorised one', async () => {
    const forbiddenRes = await call(requestId, davidCookie);
    const absentRes = await call(ABSENT_ID, davidCookie);

    const forbiddenBody = await forbiddenRes.text();
    const absentBody = await absentRes.text();

    expect(absentRes.status).toBe(404);
    expect(forbiddenRes.status).toBe(absentRes.status);

    // Byte for byte. A different message would be enough to confirm the row exists.
    expect(forbiddenBody).toBe(absentBody);
  });

  it('TEST-23b / AC-23: without a session the detail returns 401 and no request data', async () => {
    const res = await call(requestId);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error.code).toBe('UNAUTHENTICATED');
    expect(body.data).toBeUndefined();
    expect(JSON.stringify(body)).not.toContain(TAG);
  });
});
