import type { Request, Response } from 'express';
import { getAuth } from '../../shared/auth/index.js';
import { sendNoContent, sendOk, sendPage } from '../../shared/http/response.js';
import { parseInput } from '../../shared/validation/parse-input.js';
import { listNotificationsQuery, notificationIdParams } from './notifications.dto.js';
import type { NotificationsService } from './notifications.service.js';

export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  list = async (req: Request, res: Response): Promise<void> => {
    sendPage(res, await this.service.list(getAuth(req), parseInput(listNotificationsQuery, req.query)));
  };

  unreadCount = async (req: Request, res: Response): Promise<void> => {
    sendOk(res, await this.service.unreadCount(getAuth(req)));
  };

  markRead = async (req: Request, res: Response): Promise<void> => {
    const { id } = parseInput(notificationIdParams, req.params);
    await this.service.markRead(getAuth(req), id);
    sendNoContent(res);
  };

  markAllRead = async (req: Request, res: Response): Promise<void> => {
    sendOk(res, await this.service.markAllRead(getAuth(req)));
  };
}
