import { Router } from 'express';
import { guard } from '../../shared/middlewares/guard.js';
import { Permission as P } from '../../shared/rbac/permissions.js';
import type { RatingsController } from './ratings.controller.js';

/** Mounted at '/' to own the nested ratings paths without coupling to books/libraries. */
export function createRatingsRouter(controller: RatingsController): Router {
  const router = Router();

  const readers = guard({ roles: ['USER', 'LIBRARY', 'ADMIN'], permissions: [P.RATING_READ] });

  router.get('/books/:bookId/ratings', ...readers, controller.listBookRatings);
  router.post(
    '/books/:bookId/ratings',
    ...guard({ roles: ['USER'], permissions: [P.RATING_BOOK_WRITE] }),
    controller.rateBook,
  );

  router.get('/libraries/:libraryId/ratings', ...readers, controller.listLibraryRatings);
  router.post(
    '/libraries/:libraryId/ratings',
    ...guard({ roles: ['USER'], permissions: [P.RATING_LIBRARY_WRITE] }),
    controller.rateLibrary,
  );

  return router;
}
