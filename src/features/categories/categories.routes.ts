import { Router } from 'express';
import { guard } from '../../shared/middlewares/guard.js';
import { Permission as P } from '../../shared/rbac/permissions.js';
import type { CategoriesController } from './categories.controller.js';

export function createCategoriesRouter(controller: CategoriesController): Router {
  const router = Router();

  // Reading the catalog of categories is open to any authenticated role.
  router.get('/', ...guard({ roles: ['USER', 'LIBRARY', 'ADMIN'], permissions: [P.BOOK_READ] }), controller.list);

  // Only admins may add or remove categories.
  const admin = guard({ roles: ['ADMIN'], permissions: [P.CATEGORY_MANAGE] });
  router.post('/', ...admin, controller.create);
  router.delete('/:categoryId', ...admin, controller.delete);

  return router;
}
