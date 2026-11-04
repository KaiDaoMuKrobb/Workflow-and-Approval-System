import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { POST as createRequestHandler, GET as listRequestsHandler } from '../../src/app/api/requests/route';
import { PUT as updateRequestHandler } from '../../src/app/api/requests/[id]/route';
import { POST as submitRequestHandler } from '../../src/app/api/requests/[id]/submit/route';
import { GET as listReviewersHandler } from '../../src/app/api/reviewers/route';
import { NextRequest } from 'next/server';
import { prisma } from '../../src/lib/prisma';
import { signToken } from '../../src/lib/auth';
import { Role, RequestStatus } from '@prisma/client';

describe('Feature F-02: Expense Request & Line Items Management', () => {
  let aliceId: string;
  let bobId: string;
  let carolId: string;
  let davidId: string;
  let aliceCookie: string;
  let bobCookie: string;
  let davidCookie: string;

  beforeAll(async () => {
    // Note: Test suite expects standard seed accounts from prisma/seed.ts (npx prisma db seed)
    const alice = await prisma.user.findUnique({ where: { email: 'alice.req@test.com' } });
    const bob = await prisma.user.findUnique({ where: { email: 'bob.req@test.com' } });
    const carol = await prisma.user.findUnique({ where: { email: 'carol.rev@test.com' } });
    const david = await prisma.user.findUnique({ where: { email: 'david.both@test.com' } });

    if (!alice || !bob || !carol || !david) {
      throw new Error('Seed users not found. Ensure prisma db seed was run.');
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

    davidCookie = `expense_session=${signToken({
      id: david.id,
      email: david.email,
      name: david.name,
      role: david.role,
      department: david.department,
    })}`;
  });

  afterAll(async () => {
    // Clean up created test requests for Alice, Bob, David
    await prisma.approvalHistory.deleteMany({
      where: { request: { requesterId: { in: [aliceId, bobId, davidId] } } },
    });
    await prisma.expenseItem.deleteMany({
      where: { request: { requesterId: { in: [aliceId, bobId, davidId] } } },
    });
    await prisma.expenseRequest.deleteMany({
      where: { requesterId: { in: [aliceId, bobId, davidId] } },
    });
    await prisma.$disconnect();
  });

  it('TEST-10 / AC-10: creates draft request with line items, sequential EXP number, and total', async () => {
    const payload = {
      title: 'Client Onsite Workshop Travel',
      description: 'Travel and meals for technical kickoff',
      items: [
        { category: 'TRAVEL', description: 'Train Ticket', amount: 850.50 },
        { category: 'MEALS', description: 'Team Working Lunch', amount: 420.00 },
      ],
    };

    const req = new NextRequest('http://localhost:3000/api/requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: aliceCookie,
      },
      body: JSON.stringify(payload),
    });

    const res = await createRequestHandler(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data.request.status).toBe('DRAFT');
    expect(body.data.request.requestNumber).toMatch(/^EXP-\d{4}-\d{4}$/);
    expect(body.data.request.totalAmount).toBe('1270.50');
    expect(body.data.request.items).toHaveLength(2);
  });

  it('TEST-10b: concurrent request creation allocates sequential numbers without P2002 collision (BR-06)', async () => {
    const payloads = [1, 2, 3].map((n) => ({
      title: `Concurrent Request ${n}`,
      description: 'Testing concurrency lock',
      items: [{ category: 'SUPPLIES', description: `Item ${n}`, amount: 100 * n }],
    }));

    const responses = await Promise.all(
      payloads.map((payload) => {
        const req = new NextRequest('http://localhost:3000/api/requests', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            cookie: aliceCookie,
          },
          body: JSON.stringify(payload),
        });
        return createRequestHandler(req);
      })
    );

    const bodies = await Promise.all(responses.map((r) => r.json()));
    for (const res of responses) {
      expect(res.status).toBe(201);
    }

    const requestNumbers = bodies.map((b) => b.data.request.requestNumber);
    const uniqueNumbers = new Set(requestNumbers);
    expect(uniqueNumbers.size).toBe(payloads.length);
  });

  it('TEST-11 / AC-11: zero or negative item amount returns 400 VALIDATION_ERROR (BR-04)', async () => {
    const payload = {
      title: 'Invalid Line Item Request',
      description: 'Contains non-positive amount',
      items: [
        { category: 'MEALS', description: 'Coffee', amount: 0 },
      ],
    };

    const req = new NextRequest('http://localhost:3000/api/requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: aliceCookie,
      },
      body: JSON.stringify(payload),
    });

    const res = await createRequestHandler(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.message).toContain('greater than zero');
  });

  it('TEST-12 / AC-12: server-calculated total exactly matches sum with Decimal precision (BR-04)', async () => {
    const payload = {
      title: 'Precision Decimal Test',
      description: 'Precision calculation: 120.10 + 45.25 + 89.90',
      items: [
        { category: 'TRAVEL', description: 'Bus', amount: 120.10 },
        { category: 'MEALS', description: 'Snack', amount: 45.25 },
        { category: 'SUPPLIES', description: 'Notebook', amount: 89.90 },
      ],
    };

    const req = new NextRequest('http://localhost:3000/api/requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: aliceCookie,
      },
      body: JSON.stringify(payload),
    });

    const res = await createRequestHandler(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data.request.totalAmount).toBe('255.25');
  });

  it('TEST-13 / AC-13: updating DRAFT recalculates total and replaces line items', async () => {
    const createReq = new NextRequest('http://localhost:3000/api/requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: aliceCookie,
      },
      body: JSON.stringify({
        title: 'Original Title',
        description: 'Original Desc',
        items: [{ category: 'TRAVEL', description: 'Flight', amount: 2000.00 }],
      }),
    });
    const createRes = await createRequestHandler(createReq);
    const createBody = await createRes.json();
    const requestId = createBody.data.request.id;

    const updateReq = new NextRequest(`http://localhost:3000/api/requests/${requestId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        cookie: aliceCookie,
      },
      body: JSON.stringify({
        title: 'Updated Title',
        description: 'Updated Desc',
        items: [
          { category: 'TRAVEL', description: 'Flight', amount: 2000.00 },
          { category: 'ACCOMMODATION', description: 'Hotel', amount: 1500.00 },
        ],
      }),
    });

    const updateRes = await updateRequestHandler(updateReq, { params: { id: requestId } });
    const updateBody = await updateRes.json();

    expect(updateRes.status).toBe(200);
    expect(updateBody.success).toBe(true);
    expect(updateBody.data.request.title).toBe('Updated Title');
    expect(updateBody.data.request.totalAmount).toBe('3500.00');
    expect(updateBody.data.request.items).toHaveLength(2);
  });

  it('TEST-14 / AC-14: non-owner updating a request returns 404 NOT_FOUND (DEC-03 / BR-05)', async () => {
    const createReq = new NextRequest('http://localhost:3000/api/requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: aliceCookie,
      },
      body: JSON.stringify({
        title: 'Alice Private Draft',
        items: [{ category: 'MEALS', description: 'Coffee', amount: 120.00 }],
      }),
    });
    const createRes = await createRequestHandler(createReq);
    const createBody = await createRes.json();
    const requestId = createBody.data.request.id;

    // Bob tries to update Alice's draft
    const updateReq = new NextRequest(`http://localhost:3000/api/requests/${requestId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        cookie: bobCookie,
      },
      body: JSON.stringify({
        title: 'Bob Malicious Update',
        items: [{ category: 'MEALS', description: 'Coffee', amount: 999.00 }],
      }),
    });

    const updateRes = await updateRequestHandler(updateReq, { params: { id: requestId } });
    const updateBody = await updateRes.json();

    expect(updateRes.status).toBe(404);
    expect(updateBody.success).toBe(false);
    expect(updateBody.error.code).toBe('NOT_FOUND');
  });

  it('TEST-15 / AC-15: updating non-DRAFT returns 400 IMMUTABLE_AFTER_SUBMIT (BR-03)', async () => {
    const createReq = new NextRequest('http://localhost:3000/api/requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: aliceCookie,
      },
      body: JSON.stringify({
        title: 'Draft to Submit',
        items: [{ category: 'TRAVEL', description: 'Train', amount: 350.00 }],
      }),
    });
    const createRes = await createRequestHandler(createReq);
    const createBody = await createRes.json();
    const requestId = createBody.data.request.id;

    const submitReq = new NextRequest(`http://localhost:3000/api/requests/${requestId}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: aliceCookie,
      },
      body: JSON.stringify({ assignedReviewerId: carolId }),
    });
    const submitRes = await submitRequestHandler(submitReq, { params: { id: requestId } });
    expect(submitRes.status).toBe(200);

    // Attempt to update submitted request
    const updateReq = new NextRequest(`http://localhost:3000/api/requests/${requestId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        cookie: aliceCookie,
      },
      body: JSON.stringify({
        title: 'Attempted Post-Submit Edit',
        items: [{ category: 'TRAVEL', description: 'Train', amount: 999.00 }],
      }),
    });

    const updateRes = await updateRequestHandler(updateReq, { params: { id: requestId } });
    const updateBody = await updateRes.json();

    expect(updateRes.status).toBe(400);
    expect(updateBody.success).toBe(false);
    expect(updateBody.error.code).toBe('IMMUTABLE_AFTER_SUBMIT');
  });

  it('TEST-16 / AC-16: submitting DRAFT transitions status to SUBMITTED and logs ApprovalHistory', async () => {
    const createReq = new NextRequest('http://localhost:3000/api/requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: aliceCookie,
      },
      body: JSON.stringify({
        title: 'Draft for Submission Test',
        description: 'Submission test description',
        items: [{ category: 'MEALS', description: 'Lunch meeting', amount: 450.00 }],
      }),
    });
    const createRes = await createRequestHandler(createReq);
    const createBody = await createRes.json();
    const requestId = createBody.data.request.id;

    const submitReq = new NextRequest(`http://localhost:3000/api/requests/${requestId}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: aliceCookie,
      },
      body: JSON.stringify({ assignedReviewerId: carolId }),
    });

    const submitRes = await submitRequestHandler(submitReq, { params: { id: requestId } });
    const submitBody = await submitRes.json();

    expect(submitRes.status).toBe(200);
    expect(submitBody.success).toBe(true);
    expect(submitBody.data.request.status).toBe('SUBMITTED');
    expect(submitBody.data.request.assignedReviewerId).toBe(carolId);

    // Verify database record and ApprovalHistory
    const dbReq = await prisma.expenseRequest.findUnique({
      where: { id: requestId },
      include: { history: true },
    });
    expect(dbReq?.status).toBe(RequestStatus.SUBMITTED);
    expect(dbReq?.history).toHaveLength(1);
    expect(dbReq?.history[0].action).toBe('SUBMIT');
    expect(dbReq?.history[0].actorId).toBe(aliceId);
    expect(dbReq?.history[0].fromStatus).toBe(RequestStatus.DRAFT);
    expect(dbReq?.history[0].toStatus).toBe(RequestStatus.SUBMITTED);
  });

  it('TEST-17 / AC-17: submitting without reviewer ID returns 400 VALIDATION_ERROR', async () => {
    const createReq = new NextRequest('http://localhost:3000/api/requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: aliceCookie,
      },
      body: JSON.stringify({
        title: 'Draft without Reviewer',
        description: 'Should fail at submission',
        items: [{ category: 'SUPPLIES', description: 'Pens', amount: 50.00 }],
      }),
    });
    const createRes = await createRequestHandler(createReq);
    const createBody = await createRes.json();
    const requestId = createBody.data.request.id;

    const submitReq = new NextRequest(`http://localhost:3000/api/requests/${requestId}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: aliceCookie,
      },
      body: JSON.stringify({ assignedReviewerId: '' }),
    });

    const submitRes = await submitRequestHandler(submitReq, { params: { id: requestId } });
    const submitBody = await submitRes.json();

    expect(submitRes.status).toBe(400);
    expect(submitBody.success).toBe(false);
    expect(submitBody.error.code).toBe('VALIDATION_ERROR');
  });

  it('TEST-18 / AC-18: self-assignment permitted at submit time (DEC-02)', async () => {
    // Reviewer David submits an expense request designating himself as reviewer
    const createReq = new NextRequest('http://localhost:3000/api/requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: davidCookie,
      },
      body: JSON.stringify({
        title: 'David Personal Claim',
        description: 'Self-assignment test per DEC-02',
        items: [{ category: 'TRAVEL', description: 'Taxi', amount: 150.00 }],
      }),
    });
    const createRes = await createRequestHandler(createReq);
    const createBody = await createRes.json();
    const requestId = createBody.data.request.id;

    // Submit with self (davidId)
    const submitReq = new NextRequest(`http://localhost:3000/api/requests/${requestId}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: davidCookie,
      },
      body: JSON.stringify({ assignedReviewerId: davidId }),
    });

    const submitRes = await submitRequestHandler(submitReq, { params: { id: requestId } });
    const submitBody = await submitRes.json();

    expect(submitRes.status).toBe(200);
    expect(submitBody.success).toBe(true);
    expect(submitBody.data.request.status).toBe('SUBMITTED');
    expect(submitBody.data.request.assignedReviewerId).toBe(davidId);
  });

  it('TEST-18b: submitting with reviewer who does not hold REVIEWER role returns 400 VALIDATION_ERROR', async () => {
    const createReq = new NextRequest('http://localhost:3000/api/requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: aliceCookie,
      },
      body: JSON.stringify({
        title: 'Draft Assigned to Requester',
        description: 'Should fail at submission because Bob is a Requester',
        items: [{ category: 'SUPPLIES', description: 'Pens', amount: 50.00 }],
      }),
    });
    const createRes = await createRequestHandler(createReq);
    const createBody = await createRes.json();
    const requestId = createBody.data.request.id;

    // Bob is Role.REQUESTER, not Role.REVIEWER
    const submitReq = new NextRequest(`http://localhost:3000/api/requests/${requestId}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: aliceCookie,
      },
      body: JSON.stringify({ assignedReviewerId: bobId }),
    });

    const submitRes = await submitRequestHandler(submitReq, { params: { id: requestId } });
    const submitBody = await submitRes.json();

    expect(submitRes.status).toBe(400);
    expect(submitBody.success).toBe(false);
    expect(submitBody.error.code).toBe('VALIDATION_ERROR');
    expect(submitBody.error.message).toContain('REVIEWER');
  });

  it('TEST-18c: GET /api/reviewers returns only accounts holding REVIEWER role', async () => {
    const req = new NextRequest('http://localhost:3000/api/reviewers', {
      method: 'GET',
      headers: { cookie: aliceCookie },
    });

    const res = await listReviewersHandler(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data.reviewers)).toBe(true);

    // All returned accounts must be Role.REVIEWER
    for (const rev of body.data.reviewers) {
      expect(rev.role).toBe(Role.REVIEWER);
      expect(rev.id).not.toBe(aliceId);
      expect(rev.id).not.toBe(bobId);
    }
  });

  it('TEST-19 / AC-19: GET /api/requests returns only requests owned by the authenticated caller', async () => {
    // Alice requests should only contain Alice's requests
    const req = new NextRequest('http://localhost:3000/api/requests', {
      method: 'GET',
      headers: {
        cookie: aliceCookie,
      },
    });

    const res = await listRequestsHandler(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data.requests)).toBe(true);
    // Every returned request must belong to Alice
    for (const r of body.data.requests) {
      expect(r.requesterId).toBe(aliceId);
    }
  });

  it('TEST-19b: reviewer list view includes decided requests (does not vanish)', async () => {
    // 1. Create a request by Alice assigned to David and submitted
    const createReq = new NextRequest('http://localhost:3000/api/requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: aliceCookie,
      },
      body: JSON.stringify({
        title: 'Alice Decided Request Test',
        items: [{ category: 'MEALS', description: 'Lunch', amount: 300.00 }],
      }),
    });
    const createRes = await createRequestHandler(createReq);
    const createBody = await createRes.json();
    const requestId = createBody.data.request.id;

    const submitReq = new NextRequest(`http://localhost:3000/api/requests/${requestId}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: aliceCookie,
      },
      body: JSON.stringify({ assignedReviewerId: davidId }),
    });
    await submitRequestHandler(submitReq, { params: { id: requestId } });

    // 2. Transition request to APPROVED directly to simulate decision
    await prisma.expenseRequest.update({
      where: { id: requestId },
      data: { status: RequestStatus.APPROVED },
    });

    // 3. David queries GET /api/requests
    const listReq = new NextRequest('http://localhost:3000/api/requests', {
      method: 'GET',
      headers: { cookie: davidCookie },
    });
    const listRes = await listRequestsHandler(listReq);
    const listBody = await listRes.json();

    expect(listRes.status).toBe(200);
    const found = listBody.data.requests.find((r: any) => r.id === requestId);
    expect(found).toBeDefined();
    expect(found.status).toBe('APPROVED');
  });
});
