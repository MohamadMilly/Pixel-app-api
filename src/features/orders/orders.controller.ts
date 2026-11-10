import type { Request, Response } from 'express';
import { getAuth, getAuthAs } from '../../shared/auth/index.js';
import { sendCreated, sendOk, sendPage } from '../../shared/http/response.js';
import { parseInput } from '../../shared/validation/parse-input.js';
import {
  createOrderDto,
  libraryIdParams,
  listOrdersQuery,
  listReceivedBooksQuery,
  orderIdParams,
} from './orders.dto.js';
import type { OrdersService } from './orders.service.js';

export class OrdersController {
  constructor(private readonly service: OrdersService) {}

  create = async (req: Request, res: Response): Promise<void> => {
    const { libraryId } = parseInput(libraryIdParams, req.params);
    const actor = getAuthAs(req, 'USER');
    sendCreated(res, await this.service.create(actor, libraryId, parseInput(createOrderDto, req.body)));
  };

  list = async (req: Request, res: Response): Promise<void> => {
    sendPage(res, await this.service.list(getAuth(req), parseInput(listOrdersQuery, req.query)));
  };

  receivedBooks = async (req: Request, res: Response): Promise<void> => {
    const actor = getAuthAs(req, 'USER');
    sendPage(res, await this.service.listReceivedBooks(actor, parseInput(listReceivedBooksQuery, req.query)));
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const { orderId } = parseInput(orderIdParams, req.params);
    sendOk(res, await this.service.getById(getAuth(req), orderId));
  };

  cancel = async (req: Request, res: Response): Promise<void> => {
    const { orderId } = parseInput(orderIdParams, req.params);
    sendOk(res, await this.service.cancel(getAuthAs(req, 'USER'), orderId));
  };

  receive = async (req: Request, res: Response): Promise<void> => {
    const { orderId } = parseInput(orderIdParams, req.params);
    sendOk(res, await this.service.receive(getAuthAs(req, 'USER'), orderId));
  };

  accept = async (req: Request, res: Response): Promise<void> => {
    const { orderId } = parseInput(orderIdParams, req.params);
    sendOk(res, await this.service.accept(getAuthAs(req, 'LIBRARY'), orderId));
  };

  reject = async (req: Request, res: Response): Promise<void> => {
    const { orderId } = parseInput(orderIdParams, req.params);
    sendOk(res, await this.service.reject(getAuthAs(req, 'LIBRARY'), orderId));
  };

  fulfill = async (req: Request, res: Response): Promise<void> => {
    const { orderId } = parseInput(orderIdParams, req.params);
    sendOk(res, await this.service.fulfill(getAuthAs(req, 'LIBRARY'), orderId));
  };
}
