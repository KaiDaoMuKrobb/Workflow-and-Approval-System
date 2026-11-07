import { NextRequest } from 'next/server';
import { getSessionUserFromRequest } from '@/lib/auth';
import { jsonSuccess, jsonError } from '@/lib/api-response';

export async function POST(req: NextRequest) {
  const sessionUser = getSessionUserFromRequest(req);

  if (!sessionUser) {
    return jsonError('Authentication required', 'UNAUTHENTICATED', 401);
  }

  const response = jsonSuccess({ message: 'Logged out successfully' }, 200);

  // Invalidate cookie immediately
  response.cookies.set({
    name: 'expense_session',
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  return response;
}

