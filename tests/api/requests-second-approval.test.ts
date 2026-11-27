import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as reviewHandler } from '../../src/app/api/requests/[id]/review/route';
import { GET as detailHandler } from '../../src/app/api/requests/[id]/route';
import { selectReviewQueue } from '../../src/lib/review-queue';
import { prisma } from '../../src/lib/prisma';
import { signToken } from '../../src/lib/auth';
import { Prisma, RequestStatus, Role } from '@prisma/client';

/**
 * F-06: second stage approval for high value claims.
 * Contract: docs/sprints/sprint-2/F-06-second-approval.md (AC-60..AC-69), Issue #47.
 *
 * Red/green honesty. These cases fail on code whose behaviour is unmodified,
 * which is the evidence Lab 7 section 3.2 and Deliverable 2 section 3.2 ask for:
 *
 *   TEST-61            an approval above the threshold goes straight to APPROVED
 *   TEST-62, TEST-64   a claim that is not SUBMITTED cannot be decided at all
 *   TEST-62b           canViewRequest hides the claim from its own second reviewer
 *   TEST-63            the refusal arrives from the wrong guard, 400 not 403
 *   TEST-66, TEST-66b  a second reviewer is never demanded
 *   TEST-67, TEST-67b  nor is it validated
 *   TEST-68            neither stage row can exist yet
 *   TEST-69            the queue filters to SUBMITTED, so the claim is invisible
 *
 * These three are green before and after, by design, and are **not** offered as
 * red evidence. They are here because AC-60 and AC-65 are part of the F-06
 * specification and have to keep holding once the second stage exists:
 *
 *   TEST-60    a claim at the boundary still takes the single stage path
 *   TEST-60b   a claim below it is still approved without a second reviewer
 *   TEST-65    step 3 answers SELF_APPROVAL before any reviewer check runs
 *
 * One commit precedes this file: the schema and its migration, which add
 * PENDING_SECOND_APPROVAL and secondReviewerId. Without them this file cannot
 * compile, let alone fail for the right reason. That commit changes no route
 * handler and no guard, so every behaviour asserted below is still the Sprint 1
 * behaviour when these cases run red.
 */
describe('Feature F-06: Second stage approval (AC-60..AC-69)', () => {
  const TAG = `F06-${Date.now()}`;
  const THRESHOLD = '50000.00';
  const ABOVE = '50000.01';

  let aliceId: string;
  let bobId: string;
  let carolId: string;
  let davidId: string;

  let aliceCookie: string;
  let bobCookie: string;
  let carolCookie: string;
  let davidCookie: string;

  const createdIds: string[] = [];

  /**
   * Seeds a claim directly. No endpoint can produce PENDING_SECOND_APPROVAL
   * yet, and the stage two cases need a claim already in it.
   */
  async function makeClaim(opts: {
    total: string;
    status: RequestStatus;
    suffix: string;
    assignedReviewerId?: string | null;
    secondReviewerId?: string | null;
    stageOneHistory?: boolean;
  }) {
    const created = await prisma.expenseRequest.create({
      data: {
        requestNumber: `${TAG}-${opts.suffix}`,
        title: `${TAG} ${opts.suffix}`,
        description: 'Fixture created by the F-06 second stage approval suite',
        totalAmount: new Prisma.Decimal(opts.total),
        status: opts.status,
        requesterId: aliceId,
        assignedReviewerId:
          opts.assignedReviewerId === undefined ? carolId : opts.assignedReviewerId,
        secondReviewerId: opts.secondReviewerId ?? null,
        items: {
          create: [
            {
              category: 'TRAVEL',
              description: 'Conference flights',
              amount: new Prisma.Decimal(opts.total),
            },
          ],
        },
        history: {
          create: [
            {
              actorId: aliceId,
              fromStatus: RequestStatus.DRAFT,
              toStatus: RequestStatus.SUBMITTED,
              action: 'SUBMIT',
              comment: 'Request submitted for managerial review',
            },
            ...(opts.stageOneHistory
              ? [
                  {
                    actorId: carolId,
                    fromStatus: RequestStatus.SUBMITTED,
                    toStatus: RequestStatus.PENDING_SECOND_APPROVAL,
                    action: 'APPROVE_STAGE_1',
                    comment: 'Approved at the first stage, escalating for dual control',
                  },
                ]
              : []),
          ],
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
        headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
        body: JSON.stringify(body),
      }),
      { params: { id } }
    );
  }

  function readDetail(id: string, cookie?: string) {
    return detailHandler(
      new NextRequest(`http://localhost:3000/api/requests/${id}`, {
        method: 'GET',
        headers: { ...(cookie ? { cookie } : {}) },
      }),
      { params: { id } }
    );
  }

  /** A refusal must leave the record exactly as it was. */
  async function expectNoSideEffect(
    id: string,
    status: RequestStatus,
    historyCount: number
  ) {
    const stored = await prisma.expenseRequest.findUnique({ where: { id } });
    expect(stored?.status).toBe(status);
    expect(await prisma.approvalHistory.count({ where: { requestId: id } })).toBe(
      historyCount
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

    // TEST-66b only means anything if Bob genuinely holds the requester role,
    // and the dual control cases need David to be a reviewer distinct from Carol.
    expect(bob.role).toBe(Role.REQUESTER);
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

  // --------------------------------------------------------------- the boundary

  it('TEST-60 / AC-60 (BR-09): a claim of exactly 50,000.00 is approved in one stage', async () => {
    const id = await makeClaim({
      total: THRESHOLD,
      status: RequestStatus.SUBMITTED,
      suffix: 'AT-BOUNDARY',
    });

    const res = await decide(
      id,
      { action: 'APPROVE', comment: 'Within the single approval limit' },
      carolCookie
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.request.status).toBe(RequestStatus.APPROVED);

    const stored = await prisma.expenseRequest.findUnique({ where: { id } });
    expect(stored?.secondReviewerId).toBeNull();

    const rows = await prisma.approvalHistory.findMany({
      where: { requestId: id },
      orderBy: { createdAt: 'asc' },
    });
    expect(rows).toHaveLength(2);
    expect(rows[1].action).toBe('APPROVE');
    expect(rows[1].toStatus).toBe(RequestStatus.APPROVED);
  });

  it('TEST-60b / AC-60: a claim below the boundary needs no second reviewer named', async () => {
    const id = await makeClaim({
      total: '1500.00',
      status: RequestStatus.SUBMITTED,
      suffix: 'BELOW-BOUNDARY',
    });

    const res = await decide(
      id,
      { action: 'APPROVE', comment: 'Routine claim, single approval' },
      carolCookie
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.request.status).toBe(RequestStatus.APPROVED);
  });

  it('TEST-61 / AC-61 (BR-09): a claim of 50,000.01 moves to PENDING_SECOND_APPROVAL', async () => {
    const id = await makeClaim({
      total: ABOVE,
      status: RequestStatus.SUBMITTED,
      suffix: 'ABOVE-BOUNDARY',
    });

    const res = await decide(
      id,
      {
        action: 'APPROVE',
        comment: 'Above the dual control threshold, escalating',
        secondReviewerId: davidId,
      },
      carolCookie
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.request.status).toBe(RequestStatus.PENDING_SECOND_APPROVAL);

    const stored = await prisma.expenseRequest.findUnique({ where: { id } });
    expect(stored?.secondReviewerId).toBe(davidId);
  });

  // ------------------------------------------------------------- the second stage

  it('TEST-62 / AC-62: the named second reviewer approves and the claim is APPROVED', async () => {
    const id = await makeClaim({
      total: ABOVE,
      status: RequestStatus.PENDING_SECOND_APPROVAL,
      suffix: 'STAGE2-OK',
      secondReviewerId: davidId,
      stageOneHistory: true,
    });

    const res = await decide(
      id,
      { action: 'APPROVE', comment: 'Second approval granted under dual control' },
      davidCookie
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.request.status).toBe(RequestStatus.APPROVED);
  });

  it('TEST-62b / AC-62 (DEC-03): the second reviewer can open the claim they must decide', async () => {
    const id = await makeClaim({
      total: ABOVE,
      status: RequestStatus.PENDING_SECOND_APPROVAL,
      suffix: 'STAGE2-READ',
      secondReviewerId: davidId,
      stageOneHistory: true,
    });

    const res = await readDetail(id, davidCookie);
    const body = await res.json();

    // canViewRequest admits the requester and the assigned reviewer only, so
    // today this is 404 and the claim is hidden from the person who has to act
    // on it. Visibility for everyone else is unchanged, which TEST-34 proves.
    expect(res.status).toBe(200);
    expect(body.data.request.id).toBe(id);
  });

  it('TEST-63 / AC-63 (DEC-06): the first reviewer cannot grant the second approval', async () => {
    const id = await makeClaim({
      total: ABOVE,
      status: RequestStatus.PENDING_SECOND_APPROVAL,
      suffix: 'DUAL-CONTROL',
      secondReviewerId: davidId,
      stageOneHistory: true,
    });

    const res = await decide(
      id,
      { action: 'APPROVE', comment: 'Trying to approve my own escalation' },
      carolCookie
    );
    const body = await res.json();

    // 403 and not 400: Carol is not the named second reviewer, so step 4 of the
    // DEC-06 order answers before any state check. Asserting the code as well as
    // the status matters, because unmodified code also answers 400 here, from
    // step 5, for an entirely different reason.
    expect(res.status).toBe(403);
    expect(body.error.code).toBe('FORBIDDEN');

    await expectNoSideEffect(id, RequestStatus.PENDING_SECOND_APPROVAL, 2);
  });

  it('TEST-64 / AC-64: the second reviewer rejects, and the claim becomes REJECTED', async () => {
    const id = await makeClaim({
      total: ABOVE,
      status: RequestStatus.PENDING_SECOND_APPROVAL,
      suffix: 'STAGE2-REJECT',
      secondReviewerId: davidId,
      stageOneHistory: true,
    });

    const res = await decide(
      id,
      { action: 'REJECT', comment: 'Not justified at this value' },
      davidCookie
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.request.status).toBe(RequestStatus.REJECTED);
  });

  it('TEST-65 / AC-65 (BR-01): the requester cannot approve at the second stage', async () => {
    const id = await makeClaim({
      total: ABOVE,
      status: RequestStatus.PENDING_SECOND_APPROVAL,
      suffix: 'SELF-STAGE2',
      secondReviewerId: davidId,
      stageOneHistory: true,
    });

    const res = await decide(
      id,
      { action: 'APPROVE', comment: 'Approving my own claim' },
      aliceCookie
    );
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error.code).toBe('SELF_APPROVAL');

    await expectNoSideEffect(id, RequestStatus.PENDING_SECOND_APPROVAL, 2);
  });

  // ------------------------------------------- naming the second reviewer

  it('TEST-66 / AC-66: approving above the threshold without naming a second reviewer is refused', async () => {
    const id = await makeClaim({
      total: ABOVE,
      status: RequestStatus.SUBMITTED,
      suffix: 'NO-SECOND',
    });

    const res = await decide(
      id,
      { action: 'APPROVE', comment: 'Approved without naming anyone' },
      carolCookie
    );
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');

    await expectNoSideEffect(id, RequestStatus.SUBMITTED, 1);
  });

  it('TEST-66b / AC-66: a requester cannot be named as the second reviewer', async () => {
    const id = await makeClaim({
      total: ABOVE,
      status: RequestStatus.SUBMITTED,
      suffix: 'SECOND-NOT-REVIEWER',
    });

    const res = await decide(
      id,
      { action: 'APPROVE', comment: 'Naming someone who is not a reviewer', secondReviewerId: bobId },
      carolCookie
    );
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');

    await expectNoSideEffect(id, RequestStatus.SUBMITTED, 1);
  });

  it('TEST-67 / AC-67: the first reviewer cannot name themselves as the second', async () => {
    const id = await makeClaim({
      total: ABOVE,
      status: RequestStatus.SUBMITTED,
      suffix: 'SECOND-IS-SELF',
    });

    const res = await decide(
      id,
      { action: 'APPROVE', comment: 'Naming myself for the second approval', secondReviewerId: carolId },
      carolCookie
    );
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');

    await expectNoSideEffect(id, RequestStatus.SUBMITTED, 1);
  });

  it('TEST-67b / AC-67 (BR-01): the requester cannot be named as the second reviewer', async () => {
    const id = await makeClaim({
      total: ABOVE,
      status: RequestStatus.SUBMITTED,
      suffix: 'SECOND-IS-REQUESTER',
    });

    const res = await decide(
      id,
      { action: 'APPROVE', comment: 'Naming the requester for the second approval', secondReviewerId: aliceId },
      carolCookie
    );
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');

    await expectNoSideEffect(id, RequestStatus.SUBMITTED, 1);
  });

  // ---------------------------------------------------------------- the trail

  it('TEST-68 / AC-68 (BR-09): both stages are written to the audit trail', async () => {
    const id = await makeClaim({
      total: ABOVE,
      status: RequestStatus.SUBMITTED,
      suffix: 'AUDIT',
    });

    const stageOne = await decide(
      id,
      {
        action: 'APPROVE',
        comment: 'First approval, escalating for dual control',
        secondReviewerId: davidId,
      },
      carolCookie
    );
    expect(stageOne.status).toBe(200);

    const stageTwo = await decide(
      id,
      { action: 'APPROVE', comment: 'Second approval, dual control satisfied' },
      davidCookie
    );
    expect(stageTwo.status).toBe(200);

    const rows = await prisma.approvalHistory.findMany({
      where: { requestId: id },
      orderBy: { createdAt: 'asc' },
    });

    expect(rows).toHaveLength(3);

    const first = rows[1];
    expect(first.action).toBe('APPROVE_STAGE_1');
    expect(first.fromStatus).toBe(RequestStatus.SUBMITTED);
    expect(first.toStatus).toBe(RequestStatus.PENDING_SECOND_APPROVAL);
    expect(first.actorId).toBe(carolId);

    const second = rows[2];
    expect(second.action).toBe('APPROVE_STAGE_2');
    expect(second.fromStatus).toBe(RequestStatus.PENDING_SECOND_APPROVAL);
    expect(second.toStatus).toBe(RequestStatus.APPROVED);
    expect(second.actorId).toBe(davidId);
  });

  // ----------------------------------------------------------------- the queue

  it('TEST-69 / AC-69 (BR-05): a claim awaiting a second approval is queued for that reviewer only', () => {
    const claim = {
      status: 'PENDING_SECOND_APPROVAL' as const,
      assignedReviewer: { id: carolId },
      secondReviewer: { id: davidId },
      requester: { id: aliceId },
    };

    // Listed for the reviewer who has to decide it.
    expect(selectReviewQueue([claim], davidId)).toHaveLength(1);
    // Not for the reviewer who already decided stage one.
    expect(selectReviewQueue([claim], carolId)).toHaveLength(0);
    // Not for anyone else.
    expect(selectReviewQueue([claim], bobId)).toHaveLength(0);
  });
});
