import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { POST as createRequestHandler, GET as listRequestsHandler } from '../../src/app/api/requests/route';
import { PUT as updateRequestHandler } from '../../src/app/api/requests/[id]/route';
import { POST as submitRequestHandler } from '../../src/app/api/requests/[id]/submit/route';
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
    // Retrieve seeded accounts
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

  it('TEST-11 / AC-11: rejects request with non-positive line item amounts or empty items', async () => {
    const invalidPayload = {
      title: 'Invalid Request',
      description: 'Zero and negative amounts',
      items: [
        { category: 'SUPPLIES', description: 'Office Paper', amount: -150 },
      ],
    };

    const req = new NextRequest('http://localhost:3000/api/requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: aliceCookie,
      },
      body: JSON.stringify(invalidPayload),
    });

    const res = await createRequestHandler(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('TEST-12 / AC-12: server calculates totalAmount from items and discards client total (BR-04)', async () => {
    const spoofedPayload = {
      title: 'Spoofed Total Test',
      description: 'Testing server authoritative total calculation',
      totalAmount: 999999.99, // Client attempts to spoof total
      items: [
        { category: 'MEALS', description: 'Client Dinner', amount: 300.25 },
        { category: 'MEALS', description: 'Client Lunch', amount: 199.75 },
      ],
    };

    const req = new NextRequest('http://localhost:3000/api/requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: aliceCookie,
      },
      body: JSON.stringify(spoofedPayload),
    });

    const res = await createRequestHandler(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data.request.totalAmount).toBe('500.00'); // 300.25 + 199.75
  });

  it('TEST-13 / AC-13: owner can update draft header and line items, recalculating total', async () => {
    // 1. Create a draft first
    const createReq = new NextRequest('http://localhost:3000/api/requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: aliceCookie,
      },
      body: JSON.stringify({
        title: 'Initial Draft',
        description: 'Initial Description',
        items: [{ category: 'TRAVEL', description: 'Initial Taxi', amount: 200.00 }],
      }),
    });
    const createRes = await createRequestHandler(createReq);
    const createBody = await createRes.json();
    const requestId = createBody.data.request.id;

    // 2. Update the draft
    const updateReq = new NextRequest(`http://localhost:3000/api/requests/${requestId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        cookie: aliceCookie,
      },
      body: JSON.stringify({
        title: 'Updated Draft Title',
        description: 'Updated Description',
        items: [
          { category: 'TRAVEL', description: 'Updated Taxi', amount: 350.00 },
          { category: 'SUPPLIES', description: 'Notebooks', amount: 150.00 },
        ],
      }),
    });

    const updateRes = await updateRequestHandler(updateReq, { params: { id: requestId } });
    const updateBody = await updateRes.json();

    expect(updateRes.status).toBe(200);
    expect(updateBody.success).toBe(true);
    expect(updateBody.data.request.title).toBe('Updated Draft Title');
    expect(updateBody.data.request.totalAmount).toBe('500.00');
    expect(updateBody.data.request.items).toHaveLength(2);
  });

  it('TEST-14 / AC-14: non-owner edit attempt returns 404 NOT_FOUND (DEC-03 / BR-05)', async () => {
    // Alice creates draft
    const createReq = new NextRequest('http://localhost:3000/api/requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: aliceCookie,
      },
      body: JSON.stringify({
        title: 'Alice Draft for Isolation Test',
        description: 'Confidential',
        items: [{ category: 'OTHER', description: 'Secret item', amount: 100.00 }],
      }),
    });
    const createRes = await createRequestHandler(createReq);
    const createBody = await createRes.json();
    const requestId = createBody.data.request.id;

    // Bob attempts to update Alice's draft
    const updateReq = new NextRequest(`http://localhost:3000/api/requests/${requestId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        cookie: bobCookie,
      },
      body: JSON.stringify({
        title: 'Bob Hacked Title',
        items: [{ category: 'OTHER', description: 'Hacked', amount: 1.00 }],
      }),
    });

    const updateRes = await updateRequestHandler(updateReq, { params: { id: requestId } });
    const updateBody = await updateRes.json();

    expect(updateRes.status).toBe(404);
    expect(updateBody.success).toBe(false);
    expect(updateBody.error.code).toBe('NOT_FOUND');
  });

  it('TEST-15 / AC-15: edit attempt on SUBMITTED request returns 400 IMMUTABLE_AFTER_SUBMIT (BR-03)', async () => {
    // Create draft and submit it
    const createReq = new NextRequest('http://localhost:3000/api/requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: aliceCookie,
      },
      body: JSON.stringify({
        title: 'Draft to Submit and Lock',
        description: 'Immutable test',
        items: [{ category: 'TRAVEL', description: 'Flight', amount: 3000.00 }],
      }),
    });
    const createRes = await createRequestHandler(createReq);
    const createBody = await createRes.json();
    const requestId = createBody.data.request.id;

    // Submit it
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

    // Attempt to update the submitted request
    const updateReq = new NextRequest(`http://localhost:3000/api/requests/${requestId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        cookie: aliceCookie,
      },
      body: JSON.stringify({
        title: 'Attempted Post-Submit Title Change',
      }),
    });

    const updateRes = await updateRequestHandler(updateReq, { params: { id: requestId } });
    const updateBody = await updateRes.json();

    expect(updateRes.status).toBe(400);
    expect(updateBody.success).toBe(false);
    expect(updateBody.error.code).toBe('IMMUTABLE_AFTER_SUBMIT');
  });

  it('TEST-16 / AC-16: submitting draft transitions status to SUBMITTED and logs ApprovalHistory', async () => {
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
});
