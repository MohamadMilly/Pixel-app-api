import { Router } from 'express';
import { guard } from '../../shared/middlewares/guard.js';
import { Permission as P, type Permission } from '../../shared/rbac/permissions.js';
import type { OrdersController } from './orders.controller.js';

/**
 * Mounted at '/' so it can own both the nested creation path and the flat /orders paths.
 * (Does not collide with the libraries feature: '/libraries/:id' never matches
 * '/libraries/:id/orders'.)
 */
export function createOrdersRouter(controller: OrdersController): Router {
  const router = Router();

  const readers = guard({
    roles: ['USER', 'LIBRARY', 'ADMIN'],
    anyOf: [P.ORDER_READ_OWN, P.ORDER_READ_LIBRARY, P.ORDER_READ_ANY],
  });
  const userOnly = (perm: Permission) => guard({ roles: ['USER'], permissions: [perm] });
  const libraryOnly = (perm: Permission) => guard({ roles: ['LIBRARY'], permissions: [perm] });

  // Create: USER orders a book from a specific library.
  router.post('/libraries/:libraryId/orders', ...userOnly(P.ORDER_CREATE), controller.create);

  // Reads (scoped per role in the service). GET /orders already returns the current
  // user's own orders (USER scope). Received-books must precede the ":orderId" route.
  router.get('/orders', ...readers, controller.list);
  router.get('/orders/received-books', ...userOnly(P.ORDER_READ_OWN), controller.receivedBooks);
  router.get('/orders/:orderId', ...readers, controller.getById);

  // State-machine commands.
  router.patch('/orders/:orderId/cancel', ...userOnly(P.ORDER_CANCEL), controller.cancel);
  router.patch('/orders/:orderId/receive', ...userOnly(P.ORDER_RECEIVE), controller.receive);
  router.patch('/orders/:orderId/accept', ...libraryOnly(P.ORDER_ACCEPT), controller.accept);
  router.patch('/orders/:orderId/reject', ...libraryOnly(P.ORDER_REJECT), controller.reject);
  router.patch('/orders/:orderId/fulfill', ...libraryOnly(P.ORDER_FULFILL), controller.fulfill);

  return router;
}
