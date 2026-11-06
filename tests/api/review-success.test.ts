import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as reviewHandler } from '../../src/app/api/requests/[id]/review/route';
import { prisma } from '../../src/lib/prisma';
import { signToken } from '../../src/lib/auth';
import { Prisma, RequestStatus, Role } from '@prisma/client';

/**
 * F-04 — the two successful decisions: AC-30 (approve) and AC-36 (reject).
 *
 * The refusal paths live in review-guards.test.ts. Both halves are written
 * because a suite made only of refusals can leave the success path broken and
 * still report green.
 *
 * Each test builds its own request, because a decision is a one-way change and
 * a shared fixture would make the second test depend on the first one's order.
 */
describe('Feature F-04: Successful decisions (AC-30, AC-36)', () => {
  const TAG = `F04-OK-${Date.now()}`;

  let aliceId: string;
  let carolId: string;
  let carolCookie: string;

  const createdIds: string[] = [];

  async function makeSubmittedRequest(suffix: string) {
    const created = await prisma.expenseRequest.create({
      data: {
        requestNumber: `${TAG}-${suffix}`,
        title: `${TAG} ${suffix}`,
        description: 'Fixture created by the F-04 success suite',
        totalAmount: new Prisma.Decimal('1500.00'),
        status: RequestStatus.SUBMITTED,
        requesterId: aliceId,
        assignedReviewerId: carolId,
        items: {
          create: [
            { category: 'TRAVEL', description: 'Taxi both ways', amount: new Prisma.Decimal('850.00') },
            { category: 'MEALS', description: 'Client meal', amount: new Prisma.Decimal('650.00') },
          ],
        },
        history: {
          create: {
            actorId: aliceId,
            fromStatus: RequestStatus.DRAFT,
            toStatus: RequestStatus.SUBMITTED,
            action: 'SUBMIT',
            comment: 'Request submitted for managerial review',
          },
        },
      },
    });
    createdIds.push(created.id);
    return created.id;
  }

  function decide(id: string, body: unknown, cookie?: string) {
    return reviewHandler(
      new NextRequest(`http://localhost:3000/api/requests/${id}/review`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(cookie ? { cookie } : {}),
        },
        body: JSON.stringify(body),
      }),
      { params: { id } }
    );
  }

  beforeAll(async () => {
    const [alice, carol] = await Promise.all([
      prisma.user.findUnique({ where: { email: 'alice.req@test.com' } }),
      prisma.user.findUnique({ where: { email: 'carol.rev@test.com' } }),
    ]);

    if (!alice || !carol) {
      throw new Error('Seed users not found. Run `npx prisma db seed` first.');
    }

    aliceId = alice.id;
    carolId = carol.id;

    expect(carol.role).toBe(Role.REVIEWER);

    carolCookie = `expense_session=${signToken({
      id: carol.id,
      email: carol.email,
      name: carol.name,
      role: carol.role,
      department: carol.department,
    })}`;
  });

  afterAll(async () => {
    await prisma.approvalHistory.deleteMany({ where: { requestId: { in: createdIds } } });
    await prisma.expenseItem.deleteMany({ where: { requestId: { in: createdIds } } });
    await prisma.expenseRequest.deleteMany({ where: { id: { in: createdIds } } });
    await prisma.$disconnect();
  });

  it('TEST-30 / AC-30: the assigned reviewer approves, and the decision is recorded', async () => {
    const id = await makeSubmittedRequest('APPROVE');
    const historyBefore = await prisma.approvalHistory.count({ where: { requestId: id } });

    const res = await decide(
      id,
      { action: 'APPROVE', comment: 'Approved against the attached receipts' },
      carolCookie
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.request.status).toBe('APPROVED');

    // The stored record, not only the response body.
    const stored = await prisma.expenseRequest.findUnique({ where: { id } });
    expect(stored?.status).toBe(RequestStatus.APPROVED);

    const historyAfter = await prisma.approvalHistory.findMany({
      where: { requestId: id },
      orderBy: { createdAt: 'desc' },
    });
    expect(historyAfter).toHaveLength(historyBefore + 1);
    expect(historyAfter[0].action).toBe('APPROVE');
    expect(historyAfter[0].actorId).toBe(carolId);
    expect(historyAfter[0].fromStatus).toBe(RequestStatus.SUBMITTED);
    expect(historyAfter[0].toStatus).toBe(RequestStatus.APPROVED);
    expect(historyAfter[0].comment).toBe('Approved against the attached receipts');
  });

  it('TEST-36 / AC-36: the assigned reviewer rejects with a reason, and the reason is kept', async () => {
    const id = await makeSubmittedRequest('REJECT');

    const res = await decide(
      id,
      { action: 'REJECT', comment: 'Receipts incomplete' },
      carolCookie
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.request.status).toBe('REJECTED');

    const stored = await prisma.expenseRequest.findUnique({ where: { id } });
    expect(stored?.status).toBe(RequestStatus.REJECTED);

    const rows = await prisma.approvalHistory.findMany({
      where: { requestId: id, action: 'REJECT' },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].comment).toBe('Receipts incomplete');
    expect(rows[0].toStatus).toBe(RequestStatus.REJECTED);
  });

  it('TEST-30b: the decision response keeps money as a string and carries the full history (DEC-04 / SR-03)', async () => {
    const id = await makeSubmittedRequest('SERIALISE');

    const res = await decide(id, { action: 'APPROVE', comment: 'Within policy' }, carolCookie);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(typeof body.data.request.totalAmount).toBe('string');
    expect(body.data.request.totalAmount).toBe('1500.00');

    // SUBMIT from the fixture plus the APPROVE just written: the audit trail is
    // appended to, never replaced.
    const actions = body.data.request.history.map((h: { action: string }) => h.action);
    expect(actions).toContain('SUBMIT');
    expect(actions).toContain('APPROVE');
  });
});
