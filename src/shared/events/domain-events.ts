import { EventEmitter } from 'node:events';
import type { UserRole } from '../../generated/prisma/client.js';

interface ActorMeta {
  readonly ip?: string | undefined;
}

/**
 * Typed in-process domain events. Slices publish facts; other slices (audit, and
 * later notifications) subscribe without the publisher knowing about them.
 */
export interface DomainEventMap {
  'auth.signup': ActorMeta & { readonly accountId: number; readonly role: UserRole };
  'auth.login': ActorMeta & { readonly accountId: number; readonly role: UserRole };
  'auth.login_failed': ActorMeta & { readonly username: string };
  'auth.refresh': ActorMeta & { readonly accountId: number };
  'auth.logout': ActorMeta & { readonly accountId: number; readonly allSessions: boolean };
  'auth.refresh_reuse_detected': ActorMeta & { readonly accountId: number };

  'account.banned': { readonly accountId: number; readonly role: UserRole; readonly byAdminId: number };
  'account.unbanned': { readonly accountId: number; readonly role: UserRole; readonly byAdminId: number };

  'plan.created': { readonly planId: number; readonly byAdminId: number };
  'plan.updated': { readonly planId: number; readonly byAdminId: number };
  'plan.deleted': { readonly planId: number; readonly byAdminId: number };

  'subscription.requested': { readonly subscriptionId: number; readonly libraryId: number; readonly planId: number };
  'subscription.activated': {
    readonly subscriptionId: number;
    readonly libraryId: number;
    readonly byAdminId: number;
    readonly activatedAt: Date;
    readonly expiresAt: Date;
  };
  'subscription.rejected': { readonly subscriptionId: number; readonly libraryId: number; readonly byAdminId: number };
  'subscription.cancelled': { readonly subscriptionId: number; readonly libraryId: number };

  'order.created': ActorMeta & {
    readonly orderId: number;
    readonly accountId: number;
    readonly role: UserRole;
    readonly libraryId: number;
    readonly bookId: number;
  };
  'order.accepted': OrderActionEvent;
  'order.rejected': OrderActionEvent;
  'order.fulfilled': OrderActionEvent;
  'order.cancelled': OrderActionEvent;
  'order.received': OrderActionEvent;

  'book.created': { readonly bookId: number; readonly byAdminId: number };
  'book.updated': { readonly bookId: number; readonly byAdminId: number };
  'book.deleted': { readonly bookId: number; readonly byAdminId: number };
}

interface OrderActionEvent {
  readonly orderId: number;
  readonly accountId: number;
  readonly role: UserRole;
}

export type DomainEventName = keyof DomainEventMap;
export type DomainEventListener<K extends DomainEventName> = (payload: DomainEventMap[K]) => void;

export class DomainEventBus {
  private readonly emitter = new EventEmitter();

  emit<K extends DomainEventName>(event: K, payload: DomainEventMap[K]): void {
    // Listener failures must never break the request that published the event.
    try {
      this.emitter.emit(event, payload);
    } catch (error: unknown) {
      console.error(`[domain-event:${event}] listener failed`, error);
    }
  }

  on<K extends DomainEventName>(event: K, listener: DomainEventListener<K>): () => void {
    this.emitter.on(event, listener);
    return () => this.emitter.off(event, listener);
  }

  /** Subscribe one listener to several events (used by the audit subscriber). */
  onMany(events: readonly DomainEventName[], listener: (name: DomainEventName, payload: unknown) => void): void {
    for (const name of events) {
      this.emitter.on(name, (payload: unknown) => listener(name, payload));
    }
  }
}

export const domainEvents = new DomainEventBus();
