import { NextResponse } from 'next/server';
import { ApiResponse, ErrorCode } from '@/types';

export function jsonSuccess<T>(data: T, status: number = 200) {
  const body: ApiResponse<T> = {
    success: true,
    data,
  };
  return NextResponse.json(body, { status });
}

export function jsonError(message: string, code: ErrorCode, status: number) {
  const body: ApiResponse = {
    success: false,
    error: {
      message,
      code,
    },
  };
  return NextResponse.json(body, { status });
}

