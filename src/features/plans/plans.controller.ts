import type { Request, Response } from 'express';
import { getAuth, getAuthAs } from '../../shared/auth/index.js';
import { sendCreated, sendNoContent, sendOk, sendPage } from '../../shared/http/response.js';
import { parseInput } from '../../shared/validation/parse-input.js';
import { createPlanDto, listPlansQuery, planIdParams, updatePlanDto } from './plans.dto.js';
import type { PlansService } from './plans.service.js';

export class PlansController {
  constructor(private readonly service: PlansService) {}

  list = async (req: Request, res: Response): Promise<void> => {
    sendPage(res, await this.service.list(getAuth(req), parseInput(listPlansQuery, req.query)));
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const { planId } = parseInput(planIdParams, req.params);
    sendOk(res, await this.service.getById(getAuth(req), planId));
  };

  create = async (req: Request, res: Response): Promise<void> => {
    sendCreated(res, await this.service.create(getAuthAs(req, 'ADMIN'), parseInput(createPlanDto, req.body)));
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const { planId } = parseInput(planIdParams, req.params);
    sendOk(res, await this.service.update(getAuthAs(req, 'ADMIN'), planId, parseInput(updatePlanDto, req.body)));
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    const { planId } = parseInput(planIdParams, req.params);
    await this.service.delete(getAuthAs(req, 'ADMIN'), planId);
    sendNoContent(res);
  };
}
