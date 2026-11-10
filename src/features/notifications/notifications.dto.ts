import { z } from 'zod';
import { paginationQuerySchema } from '../../shared/pagination/cursor-pagination.js';
import { idParamsSchema } from '../../shared/validation/parse-input.js';
import type { NotificationRecord } from '../../shared/notifications/index.js';

export const notificationIdParams = idParamsSchema('id');

export const listNotificationsQuery = paginationQuerySchema.extend({
  unreadOnly: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional()
    .default(false),
});
export type ListNotificationsQuery = z.infer<typeof listNotificationsQuery>;

export interface NotificationView {
  readonly id: number;
  readonly content: string;
  readonly type: string | null;
  readonly orderId: number | null;
  readonly read: boolean;
  readonly createdAt: Date;
}

export function presentNotification(n: NotificationRecord): NotificationView {
  return {
    id: n.id,
    content: n.content,
    type: n.type,
    orderId: n.orderId,
    read: n.readAt !== null,
    createdAt: n.createdAt,
  };
}
