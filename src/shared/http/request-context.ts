import type { Request } from 'express';

/** Transport metadata about the caller, threaded into services for audit + refresh tokens. */
export interface RequestContext {
  readonly ip: string | undefined;
  readonly userAgent: string | undefined;
}

export function requestContext(req: Request): RequestContext {
  const ua = req.headers['user-agent'];
  return {
    ip: req.ip,
    userAgent: typeof ua === 'string' ? ua.slice(0, 255) : undefined,
  };
}
