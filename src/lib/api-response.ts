import { NextResponse } from 'next/server';

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}

export function err(message: string, status: number, details?: unknown) {
  return NextResponse.json(
    details !== undefined ? { error: message, details } : { error: message },
    { status }
  );
}

export const Errors = {
  unauthorized: () => err('Unauthorized', 401),
  forbidden: () => err('Forbidden', 403),
  notFound: (resource = 'Resource') => err(`${resource} not found`, 404),
  badRequest: (msg: string, details?: unknown) => err(msg, 400, details),
  rateLimited: () => err('Too many requests — please slow down', 429),
  serverError: () => err('Internal server error', 500),
  aiUnavailable: () => err('AI service temporarily unavailable', 503),
} as const;
