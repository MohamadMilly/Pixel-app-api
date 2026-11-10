import type { RealtimeService } from '../realtime/index.js';
import type { NotificationRepository } from './notification.repository.js';
import { NOTIFICATION_EVENT, type CreateNotificationInput, type NotificationRecord } from './notification.types.js';

/**
 * Shared notification facility: persist a notification AND push it over realtime.
 * Any feature can call `notify(...)` to inform a user or a library about something
 * (currently order-status changes).
 */
export class NotificationService {
  constructor(
    private readonly repository: NotificationRepository,
    private readonly realtime: RealtimeService,
  ) {}

  /** Store the notification, then emit it to the account's devices (best-effort push). */
  async notify(input: CreateNotificationInput): Promise<NotificationRecord> {
    const record = await this.repository.create(input);
    this.realtime.emitToAccount(record.accountId, NOTIFICATION_EVENT, record);
    return record;
  }

  /** Fire-and-forget variant for non-critical paths (push failure never breaks the caller). */
  notifySafe(input: CreateNotificationInput): void {
    this.notify(input).catch((error: unknown) => {
      console.error(`[notification] failed for account ${input.accountId}`, error);
    });
  }
}
