import type { Request, Response } from 'express';
import { getAuth, getAuthAs } from '../../shared/auth/index.js';
import { sendCreated, sendNoContent, sendOk, sendPage } from '../../shared/http/response.js';
import { parseInput } from '../../shared/validation/parse-input.js';
import {
  listSubscriptionsQuery,
  requestSubscriptionDto,
  subscriptionIdParams,
} from './subscriptions.dto.js';
import type { SubscriptionsService } from './subscriptions.service.js';

export class SubscriptionsController {
  constructor(private readonly service: SubscriptionsService) {}

  list = async (req: Request, res: Response): Promise<void> => {
    sendPage(res, await this.service.list(getAuth(req), parseInput(listSubscriptionsQuery, req.query)));
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const { subscriptionId } = parseInput(subscriptionIdParams, req.params);
    sendOk(res, await this.service.getById(getAuth(req), subscriptionId));
  };

  request = async (req: Request, res: Response): Promise<void> => {
    const actor = getAuthAs(req, 'LIBRARY');
    sendCreated(res, await this.service.request(actor, parseInput(requestSubscriptionDto, req.body)));
  };

  activate = async (req: Request, res: Response): Promise<void> => {
    const { subscriptionId } = parseInput(subscriptionIdParams, req.params);
    sendOk(res, await this.service.activate(getAuthAs(req, 'ADMIN'), subscriptionId));
  };

  reject = async (req: Request, res: Response): Promise<void> => {
    const { subscriptionId } = parseInput(subscriptionIdParams, req.params);
    await this.service.reject(getAuthAs(req, 'ADMIN'), subscriptionId);
    sendNoContent(res);
  };

  cancel = async (req: Request, res: Response): Promise<void> => {
    const { subscriptionId } = parseInput(subscriptionIdParams, req.params);
    await this.service.cancel(getAuthAs(req, 'LIBRARY'), subscriptionId);
    sendNoContent(res);
  };
}
