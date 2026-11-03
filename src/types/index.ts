import { Role, RequestStatus } from '@prisma/client';

export type ErrorCode =
  | 'UNAUTHENTICATED'
  | 'NOT_FOUND'
  | 'FORBIDDEN'
  | 'SELF_APPROVAL'
  | 'INVALID_TRANSITION'
  | 'IMMUTABLE_AFTER_SUBMIT'
  | 'VALIDATION_ERROR'
  | 'INVALID_CREDENTIALS'
  | 'INTERNAL_ERROR';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code: ErrorCode | string;
  };
}

export interface SessionUser {
  id: string;
  userId: string;
  email: string;
  name: string;
  role: Role;
  department: string;
}

export interface ExpenseItemInput {
  category: string;
  description: string;
  amount: number | string;
}

export interface CreateRequestInput {
  title: string;
  description: string;
  items: ExpenseItemInput[];
}

export interface SubmitRequestInput {
  assignedReviewerId: string;
}

export interface ReviewRequestInput {
  action: 'APPROVE' | 'REJECT';
  comment: string;
}
