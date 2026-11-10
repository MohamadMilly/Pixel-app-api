import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { isProduction } from '../../config/env.js';
import { Prisma } from '../../generated/prisma/client.js';
import type { ApiErrorResponse } from '../../types/api.types.js';
import {
  AppError,
  BadRequestError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../errors/index.js';

export const notFoundHandler: RequestHandler = (req) => {
  throw new NotFoundError(`Route ${req.method} ${req.originalUrl}`, 'ROUTE_NOT_FOUND');
};

/** Global error handler — the only place that turns errors into HTTP responses. */
export const errorHandler: ErrorRequestHandler = (err: unknown, _req, res, _next) => {
  const appError = toAppError(err);

  if (appError.statusCode >= 500) {
    console.error('[unhandled]', err);
  }

  const body: ApiErrorResponse = {
    success: false,
    error: {
      code: appError.code,
      message: appError.message,
      ...(appError.details ? { details: appError.details } : {}),
    },
  };
  res.status(appError.statusCode).json(body);
};

function toAppError(err: unknown): AppError {
  if (err instanceof AppError) return err;
  if (err instanceof ZodError) return ValidationError.fromZod(err);
  if (err instanceof Prisma.PrismaClientKnownRequestError) return fromPrismaError(err);
  if (err instanceof Prisma.PrismaClientValidationError) {
    return new BadRequestError('Invalid query parameters', 'INVALID_QUERY');
  }
  if (isBodyParserError(err)) {
    return new BadRequestError('Malformed JSON body', 'INVALID_JSON');
  }

  const message = !isProduction && err instanceof Error ? err.message : 'Internal server error';
  return new AppError(500, 'INTERNAL_SERVER_ERROR', message);
}

function fromPrismaError(err: Prisma.PrismaClientKnownRequestError): AppError {
  switch (err.code) {
    case 'P2002':
      return new ConflictError('A record with the same unique value already exists', 'UNIQUE_CONSTRAINT');
    case 'P2003':
      return new BadRequestError('Referenced record does not exist', 'FOREIGN_KEY_CONSTRAINT');
    case 'P2025':
      return new NotFoundError('Record');
    case 'P2034':
      return new ConflictError('Concurrent update detected, please retry', 'TRANSACTION_CONFLICT');
    default:
      return new AppError(500, 'DATABASE_ERROR', isProduction ? 'Database error' : err.message);
  }
}

interface BodyParserError {
  readonly type: string;
}

function isBodyParserError(err: unknown): err is BodyParserError {
  return (
    err instanceof SyntaxError &&
    'type' in err &&
    err.type === 'entity.parse.failed'
  );
}
