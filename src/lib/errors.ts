export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 500,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public readonly details?: unknown) {
    super('VALIDATION_ERROR', message, 400);
  }
}

export class AuthError extends AppError {
  constructor(message = 'Authentication required') {
    super('UNAUTHORIZED', message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access denied') {
    super('FORBIDDEN', message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super('NOT_FOUND', `${resource} not found`, 404);
  }
}

export class RateLimitError extends AppError {
  constructor() {
    super('RATE_LIMIT_EXCEEDED', 'Too many requests', 429);
  }
}

export class AIError extends AppError {
  constructor(message = 'AI service error') {
    super('AI_ERROR', message, 503);
  }
}

export function isAppError(e: unknown): e is AppError {
  return e instanceof AppError;
}
