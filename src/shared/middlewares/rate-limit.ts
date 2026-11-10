import type { RequestHandler } from 'express';
import { RateLimiterMemory, type RateLimiterRes } from 'rate-limiter-flexible';
import { AppError } from '../errors/index.js';

export interface RateLimitOptions {
  /** Allowed requests within the window. */
  readonly points: number;
  /** Window length in seconds. */
  readonly durationSeconds: number;
  /** Namespace so several limiters don't share counters. */
  readonly keyPrefix: string;
}

/**
 * In-memory rate-limit middleware (rate-limiter-flexible). Keyed by client IP.
 * Reusable: call it wherever throttling is needed, e.g. the auth routes.
 *
 * NOTE: requires `trust proxy` to reflect the real client IP. With no reverse proxy
 * in front, keep `trust proxy` = false so `req.ip` is the real socket address.
 */
export function rateLimit(options: RateLimitOptions): RequestHandler {
  const limiter = new RateLimiterMemory({
    points: options.points,
    duration: options.durationSeconds,
    keyPrefix: options.keyPrefix,
  });

  return async (req, res, next) => {
    const key = req.ip ?? 'unknown';
    try {
      await limiter.consume(key);
      next();
    } catch (rejection: unknown) {
      const retryMs = (rejection as RateLimiterRes | undefined)?.msBeforeNext ?? 1000;
      res.setHeader('Retry-After', String(Math.ceil(retryMs / 1000)));
      next(new AppError(429, 'RATE_LIMITED', 'Too many requests, please slow down and try again later.'));
    }
  };
}

/** Preset for authentication endpoints: 10 attempts per minute per IP. */
export const authRateLimit = rateLimit({ points: 10, durationSeconds: 60, keyPrefix: 'auth' });
