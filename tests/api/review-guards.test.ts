import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as reviewHandler } from '../../src/app/api/requests/[id]/review/route';
import { GET as detailHandler } from '../../src/app/api/requests/[id]/route';
import { prisma } from '../../src/lib/prisma';
import { signToken } from '../../src/lib/auth';
import { Prisma, RequestStatus, Role } from '@prisma/client';

/**
 * F-04 — the guards: BR-01, BR-02, BR-05 and the order DEC-06 fixes.
 *
 * Every refusal here re-reads the record from the database afterwards. A status
 * code alone does not prove the refusal happened before the write: a handler
 * that updated the row and then returned 403 would pass on the code and fail on
 * the re-read.
 */
describe('Feature F-04: Decision guards (AC-31..AC-35, AC-37, AC-38)', () => {
  const TAG = `F04-GUARD-${Date.now()}`;

  let aliceId: string;
  let bobId: string;
  let carolId: string;
  let davidId: string;

  let aliceCookie: string;
  let carolCookie: string;
  let davidCookie: string;

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
        description: 'Fixture created by the F-04 guard suite',
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
        history: {
          create: {
            actorId: opts.requesterId,
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

  /** Asserts the refusal left the record exactly as it was. */
  async function expectNoSideEffect(id: string, status: RequestStatus, historyCount: number) {
    const stored = await prisma.expenseRequest.findUnique({ where: { id } });
    expect(stored?.status).toBe(status);
    expect(await prisma.approvalHistory.count({ where: { requestId: id } })).toBe(historyCount);
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

    // AC-38 only discriminates between the two guard orders if David genuinely
    // holds the reviewer role. A requester would be refused for a different
    // reason and the test would prove nothing about the order.
    expect(david.role).toBe(Role.REVIEWER);
    expect(carol.role).toBe(Role.REVIEWER);

    const cookieFor = (u: NonNullable<typeof alice>) =>
      `expense_session=${signToken({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        department: u.department,
      })}`;

    aliceCookie = cookieFor(alice);
    carolCookie = cookieFor(carol);
    davidCookie = cookieFor(david);
  });

  afterAll(async () => {
    await prisma.approvalHistory.deleteMany({ where: { requestId: { in: createdIds } } });
    await prisma.expenseItem.deleteMany({ where: { requestId: { in: createdIds } } });
    await prisma.expenseRequest.deleteMany({ where: { id: { in: createdIds } } });
    await prisma.$disconnect();
  });

  it('TEST-31 / AC-31 (BR-01): nobody decides a request they raised, even assigned to themselves', async () => {
    // DEC-02 permits self-assignment at submit time, so this request is valid.
    // BR-01 is enforced here, at the decision boundary.
    const id = await makeRequest({
      requesterId: davidId,
      assignedReviewerId: davidId,
      status: RequestStatus.SUBMITTED,
      suffix: 'SELF',
    });

    const res = await decide(id, { action: 'APPROVE', comment: 'Looks fine to me' }, davidCookie);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('SELF_APPROVAL');

    await expectNoSideEffect(id, RequestStatus.SUBMITTED, 1);
  });

  it('TEST-38 / AC-38 (DEC-06): failing BR-01 and BR-05 at once answers SELF_APPROVAL, not FORBIDDEN', async () => {
    // David raised this one and assigned it to Carol. He is therefore both the
    // requester (fails BR-01) and not the assigned reviewer (fails BR-05). Only
    // the guard that runs first can name itself, so the code in the body reports
    // the order the handler was written in.
    const id = await makeRequest({
      requesterId: davidId,
      assignedReviewerId: carolId,
      status: RequestStatus.SUBMITTED,
      suffix: 'BOTH-GUARDS',
    });

    const res = await decide(id, { action: 'APPROVE', comment: 'Approving my own' }, davidCookie);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error.code).toBe('SELF_APPROVAL');
    expect(body.error.code).not.toBe('FORBIDDEN');

    await expectNoSideEffect(id, RequestStatus.SUBMITTED, 1);
  });

  it('TEST-32 / AC-32 (BR-02): a request already decided cannot be decided again', async () => {
    const id = await makeRequest({
      requesterId: aliceId,
      assignedReviewerId: carolId,
      status: RequestStatus.APPROVED,
      suffix: 'TERMINAL',
    });

    const res = await decide(id, { action: 'APPROVE', comment: 'Approving once more' }, carolCookie);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe('INVALID_TRANSITION');

    await expectNoSideEffect(id, RequestStatus.APPROVED, 1);
  });

  it('TEST-32b (BR-02): a DRAFT request cannot be decided either', async () => {
    // BR-02 is about which transitions the state machine permits, not only about
    // terminal states. DRAFT -> APPROVED is not one of them.
    const id = await makeRequest({
      requesterId: aliceId,
      assignedReviewerId: carolId,
      status: RequestStatus.DRAFT,
      suffix: 'DRAFT',
    });

    const res = await decide(id, { action: 'APPROVE', comment: 'Too early' }, carolCookie);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe('INVALID_TRANSITION');

    await expectNoSideEffect(id, RequestStatus.DRAFT, 1);
  });

  it('TEST-33 / AC-33 (BR-05): a reviewer who is not the assigned one may not decide', async () => {
    const id = await makeRequest({
      requesterId: aliceId,
      assignedReviewerId: carolId,
      status: RequestStatus.SUBMITTED,
      suffix: 'OTHER-REVIEWER',
    });

    const res = await decide(id, { action: 'APPROVE', comment: 'Helping out' }, davidCookie);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error.code).toBe('FORBIDDEN');

    await expectNoSideEffect(id, RequestStatus.SUBMITTED, 1);
  });

  it('TEST-33b (DEC-06): an unrelated reviewer acting on a decided request gets 403, not 400', async () => {
    // Agreement section 6: the permission guard always precedes the state guard,
    // so a caller without permission must not learn that the request is closed.
    const id = await makeRequest({
      requesterId: aliceId,
      assignedReviewerId: carolId,
      status: RequestStatus.APPROVED,
      suffix: 'OTHER-AND-TERMINAL',
    });

    const res = await decide(id, { action: 'REJECT', comment: 'Changing this' }, davidCookie);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error.code).toBe('FORBIDDEN');

    await expectNoSideEffect(id, RequestStatus.APPROVED, 1);
  });

  it('TEST-34 / AC-34 (BR-05 read): a requester reading a request raised by another requester gets 404', async () => {
    const id = await makeRequest({
      requesterId: bobId,
      assignedReviewerId: carolId,
      status: RequestStatus.SUBMITTED,
      suffix: 'BOBS',
    });

    const res = await detailHandler(
      new NextRequest(`http://localhost:3000/api/requests/${id}`, {
        method: 'GET',
        headers: { cookie: aliceCookie },
      }),
      { params: { id } }
    );
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
    // Zero knowledge (DEC-03): nothing about the other request may leak.
    expect(JSON.stringify(body)).not.toContain(TAG);
  });

  it('TEST-34b (BR-05 decide): a requester who is a stranger to the request gets 404, not 403', async () => {
    // The caller cannot see the request at all, so step 2 answers before any
    // permission-specific code can be returned.
    const id = await makeRequest({
      requesterId: bobId,
      assignedReviewerId: carolId,
      status: RequestStatus.SUBMITTED,
      suffix: 'STRANGER',
    });

    const res = await decide(id, { action: 'APPROVE', comment: 'Not mine at all' }, aliceCookie);
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');

    await expectNoSideEffect(id, RequestStatus.SUBMITTED, 1);
  });

  it('TEST-35 / AC-35: REJECT without a reason is refused', async () => {
    const id = await makeRequest({
      requesterId: aliceId,
      assignedReviewerId: carolId,
      status: RequestStatus.SUBMITTED,
      suffix: 'NO-REASON',
    });

    const res = await decide(id, { action: 'REJECT' }, carolCookie);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');

    await expectNoSideEffect(id, RequestStatus.SUBMITTED, 1);
  });

  it('TEST-35b: an action that is neither APPROVE nor REJECT is refused', async () => {
    const id = await makeRequest({
      requesterId: aliceId,
      assignedReviewerId: carolId,
      status: RequestStatus.SUBMITTED,
      suffix: 'BAD-ACTION',
    });

    const res = await decide(id, { action: 'RETURN', comment: 'Please revise this' }, carolCookie);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');

    await expectNoSideEffect(id, RequestStatus.SUBMITTED, 1);
  });

  it('TEST-37 / AC-37 (NFR-02): without a session the endpoint refuses and changes nothing', async () => {
    const id = await makeRequest({
      requesterId: aliceId,
      assignedReviewerId: carolId,
      status: RequestStatus.SUBMITTED,
      suffix: 'NO-SESSION',
    });

    const res = await decide(id, { action: 'APPROVE', comment: 'Anonymous approval' });
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error.code).toBe('UNAUTHENTICATED');
    expect(body.data).toBeUndefined();

    await expectNoSideEffect(id, RequestStatus.SUBMITTED, 1);
  });

  it('TEST-37b (DEC-06): with no session, a request that does not exist still answers 401', async () => {
    // Step 1 precedes step 2, so an anonymous caller cannot use the difference
    // between 401 and 404 to discover which ids exist.
    const res = await decide('00000000-0000-0000-0000-000000000000', {
      action: 'APPROVE',
      comment: 'Probing for ids',
    });
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error.code).toBe('UNAUTHENTICATED');
  });
});
