import type { Request, Response } from 'express';
import { getAuthAs } from '../../shared/auth/index.js';
import { sendCreated, sendOk } from '../../shared/http/response.js';
import { parseInput } from '../../shared/validation/parse-input.js';
import { fileIdParams } from './files.dto.js';
import type { FilesService } from './files.service.js';

export class FilesController {
  constructor(private readonly service: FilesService) {}

  createUploadUrl = async (req: Request, res: Response): Promise<void> => {
    sendCreated(res, await this.service.createUploadTarget(getAuthAs(req, 'ADMIN')));
  };

  verify = async (req: Request, res: Response): Promise<void> => {
    const { id } = parseInput(fileIdParams, req.params);
    sendOk(res, await this.service.verify(getAuthAs(req, 'ADMIN'), id));
  };
}
