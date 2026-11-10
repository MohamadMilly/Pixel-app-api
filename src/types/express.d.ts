import type { AuthContext } from '../shared/auth/auth-context.types.js';

declare global {
  namespace Express {
    interface Request {
      /** Set by the `authenticate` middleware after the DB-verified account is loaded. */
      auth?: AuthContext;
    }
  }
}

export {};
