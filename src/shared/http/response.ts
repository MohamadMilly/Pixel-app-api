import type { Response } from 'express';
import type {
  ApiPaginatedResponse,
  ApiSuccessResponse,
  Paginated,
} from '../../types/api.types.js';

export function sendOk<T>(res: Response, data: T, statusCode = 200): void {
  const body: ApiSuccessResponse<T> = { success: true, data };
  res.status(statusCode).json(body);
}

export function sendCreated<T>(res: Response, data: T): void {
  sendOk(res, data, 201);
}

export function sendNoContent(res: Response): void {
  res.status(204).end();
}

export function sendPage<T, TCursor>(res: Response, page: Paginated<T, TCursor>): void {
  const body: ApiPaginatedResponse<T, TCursor> = {
    success: true,
    data: page.data,
    pageInfo: page.pageInfo,
  };
  res.status(200).json(body);
}
