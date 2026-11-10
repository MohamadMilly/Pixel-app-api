import type { ZodError } from 'zod';

export interface ErrorDetail {
  readonly path: string;
  readonly message: string;
}

/** Base class for every error that is safe to expose to API clients. */
export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details: readonly ErrorDetail[] | undefined;

  constructor(statusCode: number, code: string, message: string, details?: readonly ErrorDetail[]) {
    super(message);
    this.name = new.target.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request', code = 'BAD_REQUEST', details?: readonly ErrorDetail[]) {
    super(400, code, message, details);
  }
}

export class ValidationError extends AppError {
  constructor(details: readonly ErrorDetail[], message = 'Validation failed') {
    super(400, 'VALIDATION_ERROR', message, details);
  }

  static fromZod(error: ZodError): ValidationError {
    return new ValidationError(
      error.issues.map((issue) => ({
        path: issue.path.map(String).join('.'),
        message: issue.message,
      })),
    );
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required', code = 'UNAUTHORIZED') {
    super(401, code, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You do not have permission to perform this action', code = 'FORBIDDEN') {
    super(403, code, message);
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource', code = 'NOT_FOUND') {
    super(404, code, `${resource} not found`);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource conflict', code = 'CONFLICT') {
    super(409, code, message);
  }
}

/** Raised when a state-machine transition is not allowed (e.g. cancelling a FULFILLED order). */
export class InvalidStateTransitionError extends AppError {
  constructor(from: string, to: string) {
    super(409, 'INVALID_STATE_TRANSITION', `Cannot transition from ${from} to ${to}`);
  }
}
