import type { Request, Response } from 'express';
import { getAuth, getAuthAs } from '../../shared/auth/index.js';
import { sendCreated, sendPage } from '../../shared/http/response.js';
import { parseInput } from '../../shared/validation/parse-input.js';
import { bookIdParams, libraryIdParams, listRatingsQuery, rateDto } from './ratings.dto.js';
import type { RatingsService } from './ratings.service.js';

export class RatingsController {
  constructor(private readonly service: RatingsService) {}

  rateBook = async (req: Request, res: Response): Promise<void> => {
    const { bookId } = parseInput(bookIdParams, req.params);
    sendCreated(res, await this.service.rateBook(getAuthAs(req, 'USER'), bookId, parseInput(rateDto, req.body)));
  };

  listBookRatings = async (req: Request, res: Response): Promise<void> => {
    const { bookId } = parseInput(bookIdParams, req.params);
    sendPage(res, await this.service.listBookRatings(getAuth(req), bookId, parseInput(listRatingsQuery, req.query)));
  };

  rateLibrary = async (req: Request, res: Response): Promise<void> => {
    const { libraryId } = parseInput(libraryIdParams, req.params);
    sendCreated(res, await this.service.rateLibrary(getAuthAs(req, 'USER'), libraryId, parseInput(rateDto, req.body)));
  };

  listLibraryRatings = async (req: Request, res: Response): Promise<void> => {
    const { libraryId } = parseInput(libraryIdParams, req.params);
    sendPage(
      res,
      await this.service.listLibraryRatings(getAuth(req), libraryId, parseInput(listRatingsQuery, req.query)),
    );
  };
}
