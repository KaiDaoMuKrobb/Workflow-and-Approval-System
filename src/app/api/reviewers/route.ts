import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUserFromRequest } from '@/lib/auth';
import { jsonSuccess, jsonError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const sessionUser = getSessionUserFromRequest(req);
    if (!sessionUser) {
      return jsonError('Authentication required', 'UNAUTHENTICATED', 401);
    }

    const reviewers = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
      },
      orderBy: { name: 'asc' },
    });

    return jsonSuccess({ reviewers }, 200);
  } catch (error) {
    console.error('List reviewers error:', error);
    return jsonError('Internal server error', 'INTERNAL_ERROR', 500);
  }
}
