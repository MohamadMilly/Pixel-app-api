import type { Request, Response } from 'express';
import { getAuth, getAuthAs } from '../../shared/auth/index.js';
import { sendCreated, sendNoContent, sendPage } from '../../shared/http/response.js';
import { parseInput } from '../../shared/validation/parse-input.js';
import { categoryIdParams, createCategoryDto, listCategoriesQuery } from './categories.dto.js';
import type { CategoriesService } from './categories.service.js';

export class CategoriesController {
  constructor(private readonly service: CategoriesService) {}

  list = async (req: Request, res: Response): Promise<void> => {
    sendPage(res, await this.service.list(getAuth(req), parseInput(listCategoriesQuery, req.query)));
  };

  create = async (req: Request, res: Response): Promise<void> => {
    sendCreated(res, await this.service.create(getAuthAs(req, 'ADMIN'), parseInput(createCategoryDto, req.body)));
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    const { categoryId } = parseInput(categoryIdParams, req.params);
    await this.service.delete(getAuthAs(req, 'ADMIN'), categoryId);
    sendNoContent(res);
  };
}
