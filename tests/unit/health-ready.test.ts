import { describe, it, expect, vi, beforeEach } from 'vitest';

const { queryRawMock } = vi.hoisted(() => ({
  queryRawMock: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: queryRawMock,
  },
}));

import { GET as healthHandler } from '../../src/app/api/health/route';
import { GET as readyHandler } from '../../src/app/api/ready/route';

describe('Health and Readiness Endpoints (Lab 5)', () => {
  beforeEach(() => {
    queryRawMock.mockReset();
  });

  it('GET /api/health returns 200 with status ok', async () => {
    const res = await healthHandler();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe('broken-for-c02-proof');
  });

  it('GET /api/ready returns 200 with db connected when database query succeeds', async () => {
    queryRawMock.mockResolvedValueOnce([{ '?column?': 1 }]);

    const res = await readyHandler();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ status: 'ready', db: 'connected' });
  });

  it('GET /api/ready returns 503 with db disconnected when database query fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    queryRawMock.mockRejectedValueOnce(new Error('Connection refused'));

    try {
      const res = await readyHandler();
      const body = await res.json();

      expect(res.status).toBe(503);
      expect(body).toEqual({ status: 'not_ready', db: 'disconnected' });
      expect(JSON.stringify(body)).not.toContain('Connection refused');
    } finally {
      consoleSpy.mockRestore();
    }
  });
});
