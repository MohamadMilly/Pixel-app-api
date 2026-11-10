import type { AuthContext } from '../../shared/auth/index.js';
import { NotFoundError } from '../../shared/errors/index.js';
import type { NotificationRepository } from '../../shared/notifications/index.js';
import { buildPage, mapPage } from '../../shared/pagination/cursor-pagination.js';
import type { Paginated } from '../../types/api.types.js';
import { presentNotification, type ListNotificationsQuery, type NotificationView } from './notifications.dto.js';

/** Read side of notifications; always scoped to the caller's own account. */
export class NotificationsService {
  constructor(private readonly repository: NotificationRepository) {}

  async list(actor: AuthContext, query: ListNotificationsQuery): Promise<Paginated<NotificationView>> {
    const rows = await this.repository.list({
      accountId: actor.accountId,
      unreadOnly: query.unreadOnly,
      cursor: query.cursor,
      limit: query.limit,
      sortOrder: query.sortOrder,
    });
    return mapPage(buildPage(rows, query.limit, (n) => n.id), presentNotification);
  }

  async unreadCount(actor: AuthContext): Promise<{ unread: number }> {
    return { unread: await this.repository.unreadCount(actor.accountId) };
  }

  async markRead(actor: AuthContext, id: number): Promise<void> {
    // Fails for a notification that isn't the caller's (or is already read) → 404 (no probing).
    if (!(await this.repository.markRead(id, actor.accountId))) {
      throw new NotFoundError('Notification');
    }
  }

  async markAllRead(actor: AuthContext): Promise<{ updated: number }> {
    return { updated: await this.repository.markAllRead(actor.accountId) };
  }
}
