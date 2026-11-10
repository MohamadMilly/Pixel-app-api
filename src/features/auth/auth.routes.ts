import { Router } from 'express';
import { guard } from '../../shared/middlewares/guard.js';
import { authRateLimit } from '../../shared/middlewares/rate-limit.js';
import type { AuthController } from './auth.controller.js';

export function createAuthRouter(controller: AuthController): Router {
  const router = Router();

  // Throttle every auth endpoint per IP to blunt password brute-forcing / abuse.
  router.use(authRateLimit);

  // Public
  router.post('/login/user', controller.loginUser);
  router.post('/login/library', controller.loginLibrary);
  router.post('/login/admin', controller.loginAdmin);
  router.post('/signup/user', controller.signupUser);
  router.post('/signup/library', controller.signupLibrary);

  // Token lifecycle — public (they carry their own refresh token in the body).
  router.post('/refresh', controller.refresh);
  router.post('/logout', controller.logout);

  // Protected — inactive libraries may call it to check their activation status.
  router.get(
    '/me',
    ...guard({ roles: ['USER', 'LIBRARY', 'ADMIN'], allowInactiveLibrary: true }),
    controller.me,
  );

  return router;
}
