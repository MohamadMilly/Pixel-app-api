import { Router } from 'express';
import { guard } from '../../shared/middlewares/guard.js';
import { Permission as P } from '../../shared/rbac/permissions.js';
import type { LibrariesController } from './libraries.controller.js';

export function createLibrariesRouter(controller: LibrariesController): Router {
  const router = Router();

  const readers = guard({ roles: ['USER', 'ADMIN', 'LIBRARY'], permissions: [P.LIBRARY_READ] });

  // Library self-service (allowed while inactive, so a library can manage its profile before activation).
  router.get(
    '/me',
    ...guard({ roles: ['LIBRARY'], permissions: [P.LIBRARY_UPDATE_OWN], allowInactiveLibrary: true }),
    controller.getOwn,
  );
  router.patch(
    '/me',
    ...guard({ roles: ['LIBRARY'], permissions: [P.LIBRARY_UPDATE_OWN], allowInactiveLibrary: true }),
    controller.updateOwn,
  );

  // Static paths must precede the ":libraryId" param route.
  router.get('/list', ...readers, controller.list);
  router.get('/map', ...readers, controller.map);
  router.get('/:libraryId', ...readers, controller.getById);

  return router;
}
