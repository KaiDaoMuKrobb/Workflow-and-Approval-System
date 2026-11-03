import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { POST as loginHandler } from '../../src/app/api/auth/login/route';
import { POST as logoutHandler } from '../../src/app/api/auth/logout/route';
import { GET as meHandler } from '../../src/app/api/auth/me/route';
import { NextRequest } from 'next/server';
import { prisma } from '../../src/lib/prisma';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';

describe('Feature F-01: Authentication API & NFR-02 Verification', () => {
  const testEmail = 'test.auth@test.com';
  const testPassword = 'Password123!';
  let createdUserId: string;

  beforeAll(async () => {
    const passwordHash = await bcrypt.hash(testPassword, 10);
    const user = await prisma.user.upsert({
      where: { email: testEmail },
      update: { passwordHash },
      create: {
        email: testEmail,
        name: 'Test Auth User',
        role: Role.REQUESTER,
        department: 'Engineering',
        passwordHash,
      },
    });
    createdUserId = user.id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: testEmail },
    });
    await prisma.$disconnect();
  });

  it('TEST-01 / AC-01: valid credentials return 200 OK, user.id, and set session cookie', async () => {
    const req = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword }),
    });

    const res = await loginHandler(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.user.email).toBe(testEmail);
    expect(body.data.user.id).toBe(createdUserId);
    expect(body.data.user.userId).toBe(createdUserId);

    const setCookie = res.headers.get('set-cookie');
    expect(setCookie).toBeTruthy();
    expect(setCookie).toContain('expense_session=');
    expect(setCookie?.toLowerCase()).toContain('httponly');
  });

  it('TEST-02 / AC-02: invalid password returns 400 Bad Request with INVALID_CREDENTIALS', async () => {
    const req = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: 'WrongPassword999!' }),
    });

    const res = await loginHandler(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('TEST-03 / AC-03: logout invalidates session cookie by setting Max-Age=0', async () => {
    const req = new NextRequest('http://localhost:3000/api/auth/logout', {
      method: 'POST',
    });

    const res = await logoutHandler(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);

    const setCookie = res.headers.get('set-cookie');
    expect(setCookie).toBeTruthy();
    expect(setCookie).toContain('Max-Age=0');
  });

  it('TEST-04 / AC-04 (NFR-02): unauthenticated request to /api/auth/me returns 401 with zero private data', async () => {
    const req = new NextRequest('http://localhost:3000/api/auth/me', {
      method: 'GET',
    });

    const res = await meHandler(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('UNAUTHENTICATED');
    expect(body.data).toBeUndefined();
  });
});
