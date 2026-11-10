import type { DomainEventBus, DomainEventName } from '../events/domain-events.js';
import type { AuditEntryInput, AuditRecorder } from './audit.types.js';

/** Fields some event payloads carry; read defensively since payloads differ per event. */
interface LooseEventPayload {
  accountId?: number;
  byAdminId?: number;
  role?: AuditEntryInput['actorRole'];
  ip?: string;
  libraryId?: number;
  planId?: number;
  subscriptionId?: number;
  orderId?: number;
  bookId?: number;
  username?: string;
  allSessions?: boolean;
}

const AUDITED_EVENTS: readonly DomainEventName[] = [
  'auth.signup',
  'auth.login',
  'auth.login_failed',
  'auth.refresh',
  'auth.logout',
  'auth.refresh_reuse_detected',
  'account.banned',
  'account.unbanned',
  'plan.created',
  'plan.updated',
  'plan.deleted',
  'subscription.requested',
  'subscription.activated',
  'subscription.rejected',
  'subscription.cancelled',
  'order.created',
  'order.accepted',
  'order.rejected',
  'order.fulfilled',
  'order.cancelled',
  'order.received',
  'book.created',
  'book.updated',
  'book.deleted',
];

/** Decide the (targetType, targetId) each event is "about". */
function resolveTarget(name: DomainEventName, p: LooseEventPayload): { type?: string; id?: number | string } {
  if (name.startsWith('account.')) return { type: 'UserAccount', id: p.accountId };
  if (name.startsWith('plan.')) return { type: 'Plan', id: p.planId };
  if (name.startsWith('subscription.')) return { type: 'Subscription', id: p.subscriptionId };
  if (name.startsWith('order.')) return { type: 'BookPrintOrder', id: p.orderId };
  if (name.startsWith('book.')) return { type: 'Book', id: p.bookId };
  if (name === 'auth.login_failed') return { type: 'UserAccount', id: p.username };
  if (name.startsWith('auth.')) return { type: 'UserAccount', id: p.accountId };
  return {};
}

/**
 * Translate every audited domain event into an append-only audit row.
 * Keeps slices decoupled from the audit log: they emit facts, this records them.
 */
export function registerAuditSubscriber(events: DomainEventBus, recorder: AuditRecorder): void {
  events.onMany(AUDITED_EVENTS, (name, rawPayload) => {
    const payload = (rawPayload ?? {}) as LooseEventPayload;
    const target = resolveTarget(name, payload);

    recorder.record({
      action: name,
      // The actor is the admin for admin actions, otherwise the account itself.
      actorAccountId: payload.byAdminId !== undefined ? undefined : payload.accountId,
      actorRole: payload.role,
      targetType: target.type,
      targetId: target.id,
      ip: payload.ip,
      metadata: buildMetadata(payload),
    });
  });
}

function buildMetadata(p: LooseEventPayload): Record<string, number | string | boolean> | undefined {
  const meta: Record<string, number | string | boolean> = {};
  if (p.byAdminId !== undefined) meta['byAdminId'] = p.byAdminId;
  if (p.libraryId !== undefined) meta['libraryId'] = p.libraryId;
  if (p.planId !== undefined) meta['planId'] = p.planId;
  if (p.bookId !== undefined) meta['bookId'] = p.bookId;
  if (p.allSessions !== undefined) meta['allSessions'] = p.allSessions;
  if (p.username !== undefined) meta['username'] = p.username;
  return Object.keys(meta).length > 0 ? meta : undefined;
}
