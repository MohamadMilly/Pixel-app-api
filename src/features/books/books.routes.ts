import { Router } from 'express';
import { authenticateOptional } from '../../shared/middlewares/authenticate-optional.js';
import { guard } from '../../shared/middlewares/guard.js';
import { Permission as P } from '../../shared/rbac/permissions.js';
import type { BooksController } from './books.controller.js';

export function createBooksRouter(controller: BooksController): Router {
  const router = Router();

  // Public reads. authenticateOptional attaches the role (if any) so the service can
  // decide whether to expose the file/signed URL — anonymous & USER never see it.
  const publicRead = authenticateOptional();
  router.get('/', publicRead, controller.list);
  router.get('/:bookId', publicRead, controller.getById);

  // Admin writes.
  router.post('/', ...guard({ roles: ['ADMIN'], permissions: [P.BOOK_CREATE] }), controller.create);
  router.put('/:bookId', ...guard({ roles: ['ADMIN'], permissions: [P.BOOK_UPDATE] }), controller.update);
  router.delete('/:bookId', ...guard({ roles: ['ADMIN'], permissions: [P.BOOK_DELETE] }), controller.delete);

  return router;
}
