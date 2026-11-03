import { describe, it, expect } from 'vitest';
import { hashPassword, comparePassword, signToken, verifyToken } from '../../src/lib/auth';
import { Role } from '@prisma/client';

describe('Auth Utility & NFR-01 (Password Security)', () => {
  it('NFR-01: hashes password with bcrypt so hash prefix is $2a$ or $2b$ and not plaintext', async () => {
    const plain = 'Password123!';
    const hashed = await hashPassword(plain);

    expect(hashed).not.toBe(plain);
    expect(hashed.startsWith('$2a$') || hashed.startsWith('$2b$')).toBe(true);

    const isMatch = await comparePassword(plain, hashed);
    expect(isMatch).toBe(true);

    const isWrongMatch = await comparePassword('WrongPassword!', hashed);
    expect(isWrongMatch).toBe(false);
  });

  it('signToken and verifyToken correctly encode and decode user claims in JWT', () => {
    const payload = {
      userId: 'test-user-uuid',
      email: 'alice.req@test.com',
      name: 'Alice Requester',
      role: Role.REQUESTER,
      department: 'Engineering',
    };

    const token = signToken(payload);
    expect(typeof token).toBe('string');

    const decoded = verifyToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded?.userId).toBe(payload.userId);
    expect(decoded?.email).toBe(payload.email);
    expect(decoded?.role).toBe(Role.REQUESTER);
  });
});

