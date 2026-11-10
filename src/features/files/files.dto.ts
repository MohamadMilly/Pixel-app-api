import { z } from 'zod';
import { idParamsSchema } from '../../shared/validation/parse-input.js';
import type { FileEntity } from './files.entity.js';

export const fileIdParams = idParamsSchema('id');

/** `POST /files/upload-url` takes no required input (the server picks the object path). */
export const getUploadUrlDto = z.strictObject({}).optional();

export interface UploadTargetView {
  readonly fileId: number;
  readonly path: string;
  readonly uploadUrl: string;
  readonly token: string | null;
  readonly expiresIn: number;
}

export interface FileView {
  readonly id: number;
  readonly status: FileEntity['status'];
  readonly mimeType: string | null;
  readonly size: number | null;
  readonly createdAt: Date;
}

export function presentFile(file: FileEntity): FileView {
  return { id: file.id, status: file.status, mimeType: file.mimeType, size: file.size, createdAt: file.createdAt };
}
