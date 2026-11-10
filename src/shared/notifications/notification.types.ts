export interface NotificationRecord {
  readonly id: number;
  readonly accountId: number;
  readonly content: string;
  readonly type: string | null;
  readonly orderId: number | null;
  readonly createdAt: Date;
  readonly readAt: Date | null;
}

export interface CreateNotificationInput {
  readonly accountId: number;
  readonly content: string;
  readonly type?: string | undefined;
  readonly orderId?: number | undefined;
}

/** The realtime event name clients listen on for a new notification. */
export const NOTIFICATION_EVENT = 'notification';
