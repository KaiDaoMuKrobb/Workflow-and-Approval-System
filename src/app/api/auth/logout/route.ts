import { NextRequest } from 'next/server';
import { jsonSuccess } from '@/lib/api-response';

export async function POST(req: NextRequest) {
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
