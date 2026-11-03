import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { comparePassword, signToken } from '@/lib/auth';
import { jsonSuccess, jsonError } from '@/lib/api-response';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return jsonError('Email and password are required', 'VALIDATION_ERROR', 400);
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      return jsonError('Invalid email or password', 'INVALID_CREDENTIALS', 400);
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      return jsonError('Invalid email or password', 'INVALID_CREDENTIALS', 400);
    }

    const tokenPayload = {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      department: user.department,
    };

    const token = signToken(tokenPayload);

    const response = jsonSuccess(
      {
        user: tokenPayload,
      },
      200
    );

    // Set secure HttpOnly cookie
    response.cookies.set({
      name: 'expense_session',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 1 day
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return jsonError('Internal server error', 'INTERNAL_ERROR', 500);
  }
}
