import type { Request, Response } from 'express';
import { getAuth, getAuthAs } from '../../shared/auth/index.js';
import { sendOk, sendPage } from '../../shared/http/response.js';
import { parseInput } from '../../shared/validation/parse-input.js';
import { libraryIdParams, listLibrariesQuery, mapQuery, updateLibraryDto } from './libraries.dto.js';
import type { LibrariesService } from './libraries.service.js';

export class LibrariesController {
  constructor(private readonly service: LibrariesService) {}

  list = async (req: Request, res: Response): Promise<void> => {
    sendPage(res, await this.service.list(getAuth(req), parseInput(listLibrariesQuery, req.query)));
  };

  map = async (req: Request, res: Response): Promise<void> => {
    sendOk(res, await this.service.map(getAuth(req), parseInput(mapQuery, req.query)));
  };

  getOwn = async (req: Request, res: Response): Promise<void> => {
    sendOk(res, await this.service.getOwn(getAuthAs(req, 'LIBRARY')));
  };

  updateOwn = async (req: Request, res: Response): Promise<void> => {
    sendOk(res, await this.service.updateOwn(getAuthAs(req, 'LIBRARY'), parseInput(updateLibraryDto, req.body)));
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const { libraryId } = parseInput(libraryIdParams, req.params);
    sendOk(res, await this.service.getById(getAuth(req), libraryId));
  };
}
