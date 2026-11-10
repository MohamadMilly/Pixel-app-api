import type { Request, Response } from 'express';
import { getAuthAs } from '../../shared/auth/index.js';
import { sendCreated, sendNoContent, sendOk, sendPage } from '../../shared/http/response.js';
import { parseInput } from '../../shared/validation/parse-input.js';
import { bookIdParams, createBookDto, getBookQuery, listBooksQuery, updateBookDto } from './books.dto.js';
import type { BooksService } from './books.service.js';

export class BooksController {
  constructor(private readonly service: BooksService) {}

  // Public (optional auth) — req.auth is set only when a valid token was sent.
  list = async (req: Request, res: Response): Promise<void> => {
    sendPage(res, await this.service.list(req.auth, parseInput(listBooksQuery, req.query)));
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const { bookId } = parseInput(bookIdParams, req.params);
    sendOk(res, await this.service.getById(req.auth, bookId, parseInput(getBookQuery, req.query)));
  };

  // Admin only.
  create = async (req: Request, res: Response): Promise<void> => {
    sendCreated(res, await this.service.create(getAuthAs(req, 'ADMIN'), parseInput(createBookDto, req.body)));
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const { bookId } = parseInput(bookIdParams, req.params);
    sendOk(res, await this.service.update(getAuthAs(req, 'ADMIN'), bookId, parseInput(updateBookDto, req.body)));
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    const { bookId } = parseInput(bookIdParams, req.params);
    await this.service.delete(getAuthAs(req, 'ADMIN'), bookId);
    sendNoContent(res);
  };
}
