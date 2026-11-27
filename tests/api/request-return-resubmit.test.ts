import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as reviewHandler } from '../../src/app/api/requests/[id]/review/route';
import { PUT as updateHandler } from '../../src/app/api/requests/[id]/route';
import { POST as submitHandler } from '../../src/app/api/requests/[id]/submit/route';
import { prisma } from '../../src/lib/prisma';
import { signToken } from '../../src/lib/auth';
import { Prisma, RequestStatus, Role } from '@prisma/client';

/**
 * F-05: return for revision and resubmission.
 * Contract: docs/sprints/sprint-2/F-05-return-resubmit.md (AC-50..AC-59), Issue #45.
 *
 * Red/green honesty. These cases fail on unmodified code because the behaviour
 * is missing, which is the evidence Lab 7 section 3.2 and Deliverable 2
 * section 3.2 ask for:
 *
 *   TEST-50, TEST-51, TEST-52   RETURN is not an accepted action yet
 *   TEST-54, TEST-54b          PUT refuses any status other than DRAFT
 *   TEST-56, TEST-56b          submit refuses any status other than DRAFT
 *   TEST-57                    neither audit row can exist yet
 *
 * These three are green before and after, by design, and are **not** offered as
 * red evidence. They are here because AC-53, AC-55 and AC-59 are part of the
 * F-05 specification and must keep holding once RETURN exists. The guard order
 * fixed by DEC-06 already refuses them before the action is ever parsed:
 *
 *   TEST-53   step 4 answers 403 FORBIDDEN before step 6 reads the action
 *   TEST-55   PUT and submit check ownership before they check status
 *   TEST-59   step 5 answers 400 INVALID_TRANSITION before step 6
 *
 * AC-58 is covered by the existing TEST-15 in tests/api/request-crud.test.ts,
 * which asserts that editing a SUBMITTED claim is still refused with 400
 * IMMUTABLE_AFTER_SUBMIT. It is deliberately not duplicated here; widening the
 * guard to DRAFT or RETURNED must leave it green and unmodified.
 *
 * TEST-59b is a manual interface check recorded with dated screenshots.
 */
describe('Feature F-05: Return and resubmission (AC-50..AC-59)', () => {
  const TAG = `F05-${Date.now()}`;

  let aliceId: string;
  let bobId: string;
  let carolId: string;
  let davidId: string;

  let aliceCookie: string;
  let bobCookie: string;
  let carolCookie: string;
  let davidCookie: string;

  const createdIds: string[] = [];

  /** Seeds a claim directly, because no endpoint can produce RETURNED yet. */
  async function makeClaim(opts: {
    requesterId: string;
    assignedReviewerId: string | null;
    status: RequestStatus;
    suffix: string;
    withSubmitHistory?: boolean;
  }) {
    const created = await prisma.expenseRequest.create({
      data: {
        requestNumber: `${TAG}-${opts.suffix}`,
        title: `${TAG} ${opts.suffix}`,
        description: 'Fixture created by the F-05 return and resubmission suite',
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
        ...(opts.withSubmitHistory === false
          ? {}
          : {
              history: {
                create: {
                  actorId: opts.requesterId,
                  fromStatus: RequestStatus.DRAFT,
                  toStatus: RequestStatus.SUBMITTED,
                  action: 'SUBMIT',
                  comment: 'Request submitted for managerial review',
                },
              },
            }),
      },
    });
    createdIds.push(created.id);
    return created.id;
  }

  function decide(id: string, body: unknown, cookie?: string) {
    return reviewHandler(
      new NextRequest(`http://localhost:3000/api/requests/${id}/review`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
        body: JSON.stringify(body),
      }),
      { params: { id } }
    );
  }

  function update(id: string, body: unknown, cookie?: string) {
    return updateHandler(
      new NextRequest(`http://localhost:3000/api/requests/${id}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
        body: JSON.stringify(body),
      }),
      { params: { id } }
    );
  }

  function submit(id: string, body: unknown, cookie?: string) {
    return submitHandler(
      new NextRequest(`http://localhost:3000/api/requests/${id}/submit`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
        body: JSON.stringify(body),
      }),
      { params: { id } }
    );
  }

  /** A refusal must leave the record exactly as it was. */
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

    // TEST-53 only discriminates between "wrong reviewer" and "wrong role" if
    // David genuinely holds the reviewer role, and TEST-56b needs him to be a
    // dual-role account for the self-assignment path to be reachable at all.
    expect(carol.role).toBe(Role.REVIEWER);
    expect(david.role).toBe(Role.REVIEWER);

    aliceId = alice.id;
    bobId = bob.id;
    carolId = carol.id;
    davidId = david.id;

    const cookieFor = (u: NonNullable<typeof alice>) =>
      `expense_session=${signToken({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        department: u.department,
      })}`;

    aliceCookie = cookieFor(alice);
    bobCookie = cookieFor(bob);
    carolCookie = cookieFor(carol);
    davidCookie = cookieFor(david);
  });

  afterAll(async () => {
    await prisma.approvalHistory.deleteMany({ where: { requestId: { in: createdIds } } });
    await prisma.expenseItem.deleteMany({ where: { requestId: { in: createdIds } } });
    await prisma.expenseRequest.deleteMany({ where: { id: { in: createdIds } } });
    await prisma.$disconnect();
  });

  it('TEST-50 / AC-50: the assigned reviewer returns a SUBMITTED claim for revision', async () => {
    const id = await makeClaim({
      requesterId: aliceId,
      assignedReviewerId: carolId,
      status: RequestStatus.SUBMITTED,
      suffix: 'RETURN-OK',
    });

    const res = await decide(
      id,
      { action: 'RETURN', comment: 'Please attach the hotel receipt' },
      carolCookie
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.request.status).toBe(RequestStatus.RETURNED);

    const stored = await prisma.expenseRequest.findUnique({ where: { id } });
    expect(stored?.status).toBe(RequestStatus.RETURNED);
  });

  it('TEST-51 / AC-51 (BR-07): a return reason of nine characters is refused', async () => {
    const id = await makeClaim({
      requesterId: aliceId,
      assignedReviewerId: carolId,
      status: RequestStatus.SUBMITTED,
      suffix: 'RETURN-SHORT',
    });

    const res = await decide(id, { action: 'RETURN', comment: 'Fix this' + '!' }, carolCookie);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    // The message is asserted, not only the code. On unmodified code the same
    // 400 VALIDATION_ERROR comes back because RETURN is an unrecognised action,
    // so without this the case would pass for the wrong reason and prove
    // nothing about BR-07.
    expect(body.error.message).toMatch(/10 characters/i);

    await expectNoSideEffect(id, RequestStatus.SUBMITTED, 1);
  });

  it('TEST-52 / AC-52 (BR-07): a return reason of exactly ten characters is accepted', async () => {
    const id = await makeClaim({
      requesterId: aliceId,
      assignedReviewerId: carolId,
      status: RequestStatus.SUBMITTED,
      suffix: 'RETURN-BOUNDARY',
    });

    const comment = 'Fix total.';
    expect(comment).toHaveLength(10);

    const res = await decide(id, { action: 'RETURN', comment }, carolCookie);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.request.status).toBe(RequestStatus.RETURNED);
  });

  it('TEST-53 / AC-53 (BR-05): a reviewer who is not the assignee cannot return', async () => {
    const id = await makeClaim({
      requesterId: aliceId,
      assignedReviewerId: carolId,
      status: RequestStatus.SUBMITTED,
      suffix: 'RETURN-FORBIDDEN',
    });

    const res = await decide(
      id,
      { action: 'RETURN', comment: 'I would like this corrected' },
      davidCookie
    );
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error.code).toBe('FORBIDDEN');

    await expectNoSideEffect(id, RequestStatus.SUBMITTED, 1);
  });

  it('TEST-54 / AC-54: the requester replaces line items while the claim is RETURNED', async () => {
    const id = await makeClaim({
      requesterId: aliceId,
      assignedReviewerId: carolId,
      status: RequestStatus.RETURNED,
      suffix: 'EDIT-ITEMS',
    });

    const res = await update(
      id,
      {
        items: [
          { category: 'TRAVEL', description: 'Corrected taxi fare', amount: 400 },
          { category: 'MEALS', description: 'Corrected client meal', amount: 250.5 },
        ],
      },
      aliceCookie
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.request.totalAmount).toBe('650.50');
    expect(body.data.request.items).toHaveLength(2);
    // Editing must not move the claim on by itself; only a resubmission does.
    expect(body.data.request.status).toBe(RequestStatus.RETURNED);

    const stored = await prisma.expenseRequest.findUnique({ where: { id }, include: { items: true } });
    expect(stored?.status).toBe(RequestStatus.RETURNED);
    expect(stored?.totalAmount.toFixed(2)).toBe('650.50');
    expect(stored?.items).toHaveLength(2);
  });

  it('TEST-54b / AC-54: a header-only edit while RETURNED leaves the items untouched', async () => {
    const id = await makeClaim({
      requesterId: aliceId,
      assignedReviewerId: carolId,
      status: RequestStatus.RETURNED,
      suffix: 'EDIT-HEADER',
    });

    const res = await update(id, { title: `${TAG} corrected title` }, aliceCookie);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.request.title).toBe(`${TAG} corrected title`);
    expect(body.data.request.status).toBe(RequestStatus.RETURNED);

    // The second write path must not disturb the items or the stored total.
    const stored = await prisma.expenseRequest.findUnique({ where: { id }, include: { items: true } });
    expect(stored?.items).toHaveLength(2);
    expect(stored?.totalAmount.toFixed(2)).toBe('1500.00');
  });

  it('TEST-55 / AC-55 (BR-08): a non-owner can neither edit nor resubmit a RETURNED claim', async () => {
    const id = await makeClaim({
      requesterId: aliceId,
      assignedReviewerId: carolId,
      status: RequestStatus.RETURNED,
      suffix: 'NON-OWNER',
    });

    const putRes = await update(id, { title: 'Hijacked title' }, bobCookie);
    const putBody = await putRes.json();
    expect(putRes.status).toBe(404);
    expect(putBody.error.code).toBe('NOT_FOUND');

    const submitRes = await submit(id, { assignedReviewerId: carolId }, bobCookie);
    const submitBody = await submitRes.json();
    expect(submitRes.status).toBe(404);
    expect(submitBody.error.code).toBe('NOT_FOUND');

    await expectNoSideEffect(id, RequestStatus.RETURNED, 1);
    const stored = await prisma.expenseRequest.findUnique({ where: { id } });
    expect(stored?.title).toBe(`${TAG} NON-OWNER`);
  });

  it('TEST-56 / AC-56: the requester resubmits a RETURNED claim for review', async () => {
    const id = await makeClaim({
      requesterId: aliceId,
      assignedReviewerId: carolId,
      status: RequestStatus.RETURNED,
      suffix: 'RESUBMIT',
    });

    const res = await submit(id, { assignedReviewerId: carolId }, aliceCookie);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.request.status).toBe(RequestStatus.SUBMITTED);

    const stored = await prisma.expenseRequest.findUnique({ where: { id } });
    expect(stored?.status).toBe(RequestStatus.SUBMITTED);
  });

  it('TEST-56b / AC-56 (DEC-02 v2.0): resubmitting to oneself is still refused', async () => {
    const id = await makeClaim({
      requesterId: davidId,
      assignedReviewerId: carolId,
      status: RequestStatus.RETURNED,
      suffix: 'RESUBMIT-SELF',
    });

    const res = await submit(id, { assignedReviewerId: davidId }, davidCookie);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe('SELF_ASSIGNMENT');

    await expectNoSideEffect(id, RequestStatus.RETURNED, 1);
  });

  it('TEST-57 / AC-57 (BR-08): both transitions are written to the audit trail', async () => {
    const id = await makeClaim({
      requesterId: aliceId,
      assignedReviewerId: carolId,
      status: RequestStatus.SUBMITTED,
      suffix: 'AUDIT',
    });

    const reason = 'Receipt is missing for the hotel line';
    const returned = await decide(id, { action: 'RETURN', comment: reason }, carolCookie);
    expect(returned.status).toBe(200);

    const resubmitted = await submit(id, { assignedReviewerId: carolId }, aliceCookie);
    expect(resubmitted.status).toBe(200);

    const history = await prisma.approvalHistory.findMany({
      where: { requestId: id },
      orderBy: { createdAt: 'asc' },
    });

    // The seeded SUBMIT row, then RETURN, then RESUBMIT.
    expect(history).toHaveLength(3);

    const returnRow = history[1];
    expect(returnRow.fromStatus).toBe(RequestStatus.SUBMITTED);
    expect(returnRow.toStatus).toBe(RequestStatus.RETURNED);
    expect(returnRow.action).toBe('RETURN');
    expect(returnRow.comment).toBe(reason);
    expect(returnRow.actorId).toBe(carolId);

    const resubmitRow = history[2];
    // The handler hard-codes fromStatus: DRAFT today, so this row would read
    // DRAFT -> SUBMITTED and misreport the trail BR-08 exists to guarantee.
    expect(resubmitRow.fromStatus).toBe(RequestStatus.RETURNED);
    expect(resubmitRow.toStatus).toBe(RequestStatus.SUBMITTED);
    expect(resubmitRow.action).toBe('RESUBMIT');
    expect(resubmitRow.actorId).toBe(aliceId);
  });

  it('TEST-59 / AC-59 (BR-02): a claim that is not SUBMITTED cannot be returned', async () => {
    const approvedId = await makeClaim({
      requesterId: aliceId,
      assignedReviewerId: carolId,
      status: RequestStatus.APPROVED,
      suffix: 'RETURN-APPROVED',
    });
    const draftId = await makeClaim({
      requesterId: aliceId,
      assignedReviewerId: carolId,
      status: RequestStatus.DRAFT,
      suffix: 'RETURN-DRAFT',
      withSubmitHistory: false,
    });

    for (const [id, status, history] of [
      [approvedId, RequestStatus.APPROVED, 1],
      [draftId, RequestStatus.DRAFT, 0],
    ] as const) {
      const res = await decide(
        id,
        { action: 'RETURN', comment: 'This needs another look' },
        carolCookie
      );
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error.code).toBe('INVALID_TRANSITION');

      await expectNoSideEffect(id, status, history);
    }
  });
});
