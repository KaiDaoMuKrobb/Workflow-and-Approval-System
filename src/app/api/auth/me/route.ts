import { NextRequest } from 'next/server';
import { getSessionUserFromRequest } from '@/lib/auth';
import { jsonSuccess, jsonError } from '@/lib/api-response';

export async function GET(req: NextRequest) {
  const sessionUser = getSessionUserFromRequest(req);

  if (!sessionUser) {
    return jsonError('Authentication required', 'UNAUTHENTICATED', 401);
  }

  return jsonSuccess(
    {
      user: {
        id: sessionUser.id,
        email: sessionUser.email,
        name: sessionUser.name,
        role: sessionUser.role,
        department: sessionUser.department,
      },
    },
    200
  );
}
