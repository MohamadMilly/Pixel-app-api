import type { Request, Response } from 'express';
import { getAuthAs } from '../../shared/auth/index.js';
import { sendOk, sendPage } from '../../shared/http/response.js';
import { parseInput } from '../../shared/validation/parse-input.js';
import { accountIdParams, listAccountsQuery } from './accounts.dto.js';
import type { AccountsService } from './accounts.service.js';

export class AccountsController {
  constructor(private readonly service: AccountsService) {}

  list = async (req: Request, res: Response): Promise<void> => {
    sendPage(res, await this.service.list(getAuthAs(req, 'ADMIN'), parseInput(listAccountsQuery, req.query)));
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const { accountId } = parseInput(accountIdParams, req.params);
    sendOk(res, await this.service.getById(getAuthAs(req, 'ADMIN'), accountId));
  };

  ban = async (req: Request, res: Response): Promise<void> => {
    const { accountId } = parseInput(accountIdParams, req.params);
    sendOk(res, await this.service.ban(getAuthAs(req, 'ADMIN'), accountId));
  };

  unban = async (req: Request, res: Response): Promise<void> => {
    const { accountId } = parseInput(accountIdParams, req.params);
    sendOk(res, await this.service.unban(getAuthAs(req, 'ADMIN'), accountId));
  };
}
