import type { Request, Response } from 'express';
import { getAuthAs } from '../../shared/auth/index.js';
import { sendPage } from '../../shared/http/response.js';
import { parseInput } from '../../shared/validation/parse-input.js';
import { listAuditLogsQuery } from './audit.dto.js';
import type { AuditQueryService } from './audit.service.js';

export class AuditController {
  constructor(private readonly service: AuditQueryService) {}

  list = async (req: Request, res: Response): Promise<void> => {
    sendPage(res, await this.service.list(getAuthAs(req, 'ADMIN'), parseInput(listAuditLogsQuery, req.query)));
  };
}
