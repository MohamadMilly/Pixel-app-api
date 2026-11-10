import type { AuthContext, LibraryAuthContext, UserAuthContext } from '../../shared/auth/index.js';
import { ConflictError, InvalidStateTransitionError, NotFoundError } from '../../shared/errors/index.js';
import type { DomainEventBus, DomainEventName } from '../../shared/events/domain-events.js';
import type { NotificationService } from '../../shared/notifications/index.js';
import { buildPage, mapPage } from '../../shared/pagination/cursor-pagination.js';
import type { Paginated } from '../../types/api.types.js';
import {
  presentOrder,
  type CreateOrderDto,
  type ListOrdersQuery,
  type ListReceivedBooksQuery,
  type OrderView,
  type ReceivedBookView,
} from './orders.dto.js';
import {
  canTransition,
  computePriceSnapshot,
  transitionFor,
  type OrderAction,
  type OrderDetails,
} from './orders.entity.js';
import { orderPolicy } from './orders.policy.js';
import type { OrdersRepository } from './orders.repository.js';

const ACTION_EVENT: Readonly<Record<OrderAction, DomainEventName>> = {
  accept: 'order.accepted',
  reject: 'order.rejected',
  fulfill: 'order.fulfilled',
  cancel: 'order.cancelled',
  receive: 'order.received',
};

export class OrdersService {
  constructor(
    private readonly repository: OrdersRepository,
    private readonly events: DomainEventBus,
    private readonly notifications: NotificationService,
  ) {}

  /** USER creates an order from a (visible) library; the price is snapshotted now. */
  async create(actor: UserAuthContext, libraryId: number, dto: CreateOrderDto): Promise<OrderView> {
    const targets = await this.repository.findOrderableTargets(dto.bookId, libraryId, new Date());
    if (!targets) {
      // Book missing, or library missing/not currently active — reported as 404 either way.
      throw new NotFoundError('Book or library', 'ORDER_TARGET_UNAVAILABLE');
    }

    const snapshot = computePriceSnapshot(targets.book.pages, targets.library.pagePrice, targets.library.extraFees);
    const order = await this.repository.create({
      senderId: actor.profileId,
      bookId: targets.book.id,
      libraryId: targets.library.id,
      ...snapshot,
    });

    this.events.emit('order.created', {
      orderId: order.id,
      accountId: actor.accountId,
      role: actor.role,
      libraryId: targets.library.id,
      bookId: targets.book.id,
    });
    // Notify the library that a new order arrived.
    this.notifications.notifySafe({
      accountId: order.library.accountId,
      content: `New order #${order.id} received (PENDING).`,
      type: 'ORDER_STATUS',
      orderId: order.id,
    });
    return presentOrder(order);
  }

  async list(actor: AuthContext, query: ListOrdersQuery): Promise<Paginated<OrderView>> {
    const scope = orderPolicy.listScope(actor, { libraryId: query.libraryId, senderId: query.senderId });
    const rows = await this.repository.list({
      filter: { senderId: scope.senderId, libraryId: scope.libraryId, status: query.status, bookId: query.bookId },
      cursor: query.cursor,
      limit: query.limit,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
    return mapPage(buildPage(rows, query.limit, (o) => o.id), presentOrder);
  }

  /** Books the current user has received at least one order for. */
  async listReceivedBooks(actor: UserAuthContext, query: ListReceivedBooksQuery): Promise<Paginated<ReceivedBookView>> {
    const rows = await this.repository.listReceivedBooks({
      userId: actor.profileId,
      cursor: query.cursor,
      limit: query.limit,
      sortOrder: query.sortOrder,
    });
    return buildPage(rows, query.limit, (b) => b.id);
  }

  async getById(actor: AuthContext, orderId: number): Promise<OrderView> {
    const order = await this.repository.findById(orderId);
    if (!order || !orderPolicy.canView(actor, order)) {
      throw new NotFoundError('Order');
    }
    return presentOrder(order);
  }

  /* ───────────────────────── state-machine commands ───────────────────────── */

  cancel(actor: UserAuthContext, orderId: number): Promise<OrderView> {
    return this.act(actor, orderId, 'cancel');
  }
  receive(actor: UserAuthContext, orderId: number): Promise<OrderView> {
    return this.act(actor, orderId, 'receive');
  }
  accept(actor: LibraryAuthContext, orderId: number): Promise<OrderView> {
    return this.act(actor, orderId, 'accept');
  }
  reject(actor: LibraryAuthContext, orderId: number): Promise<OrderView> {
    return this.act(actor, orderId, 'reject');
  }
  fulfill(actor: LibraryAuthContext, orderId: number): Promise<OrderView> {
    return this.act(actor, orderId, 'fulfill');
  }

  private async act(actor: UserAuthContext | LibraryAuthContext, orderId: number, action: OrderAction): Promise<OrderView> {
    const order = await this.repository.findById(orderId);
    // Not found OR not the caller's order → 404 (prevents probing other people's order ids).
    if (!order || !orderPolicy.canView(actor, order)) {
      throw new NotFoundError('Order');
    }

    const { from, to } = transitionFor(action);
    if (!canTransition(action, order.status)) {
      throw new InvalidStateTransitionError(order.status, action);
    }

    const updated = await this.repository.transition(order.id, from, to);
    if (!updated) {
      throw new ConflictError('Order status changed concurrently, please retry', 'TRANSACTION_CONFLICT');
    }

    this.events.emit(ACTION_EVENT[action], { orderId: order.id, accountId: actor.accountId, role: actor.role });
    this.notifyCounterparty(order, action);
    return this.reload(order.id);
  }

  /** Tell the other party about the new status (library acts → user is told, and vice-versa). */
  private notifyCounterparty(order: OrderDetails, action: OrderAction): void {
    const toUser = { accountId: order.sender.accountId };
    const toLibrary = { accountId: order.library.accountId };
    const messages: Record<OrderAction, { target: { accountId: number }; content: string }> = {
      accept: { target: toUser, content: `Your order #${order.id} was accepted.` },
      reject: { target: toUser, content: `Your order #${order.id} was rejected.` },
      fulfill: { target: toUser, content: `Your order #${order.id} is ready for pickup.` },
      cancel: { target: toLibrary, content: `Order #${order.id} was cancelled by the customer.` },
      receive: { target: toLibrary, content: `Order #${order.id} was received by the customer.` },
    };
    const msg = messages[action];
    this.notifications.notifySafe({
      accountId: msg.target.accountId,
      content: msg.content,
      type: 'ORDER_STATUS',
      orderId: order.id,
    });
  }

  private async reload(orderId: number): Promise<OrderView> {
    const order = await this.repository.findById(orderId);
    if (!order) throw new NotFoundError('Order');
    return presentOrder(order);
  }
}
