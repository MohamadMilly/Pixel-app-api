import { Router } from 'express';
import { guard } from '../../shared/middlewares/guard.js';
import { Permission as P } from '../../shared/rbac/permissions.js';
import type { FilesController } from './files.controller.js';

/** File management is ADMIN-only (books are admin-created). */
export function createFilesRouter(controller: FilesController): Router {
  const router = Router();
  const admin = guard({ roles: ['ADMIN'], permissions: [P.FILE_WRITE] });

  // POST /api/v1/files/upload-url  → pre-signed upload URL + PENDING file record
  router.post('/upload-url', ...admin, controller.createUploadUrl);
  // POST /api/v1/files/:id/verify  → validate size/mime/virus, flip to CHECKED
  router.post('/:id/verify', ...admin, controller.verify);

  return router;
}
