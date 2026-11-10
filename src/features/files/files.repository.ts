import type { PrismaClient } from '../../generated/prisma/client.js';
import type { FileEntity } from './files.entity.js';

const fileSelect = {
  id: true,
  path: true,
  status: true,
  mimeType: true,
  size: true,
  createdAt: true,
} as const;

export interface FilesRepository {
  createPending(path: string): Promise<FileEntity>;
  findById(id: number): Promise<FileEntity | null>;
  markChecked(id: number, data: { mimeType: string; size: number }): Promise<FileEntity>;
  delete(id: number): Promise<void>;
}

export class PrismaFilesRepository implements FilesRepository {
  constructor(private readonly db: PrismaClient) {}

  createPending(path: string): Promise<FileEntity> {
    return this.db.file.create({ data: { path, status: 'PENDING' }, select: fileSelect });
  }

  findById(id: number): Promise<FileEntity | null> {
    return this.db.file.findUnique({ where: { id }, select: fileSelect });
  }

  markChecked(id: number, data: { mimeType: string; size: number }): Promise<FileEntity> {
    return this.db.file.update({
      where: { id },
      data: { status: 'CHECKED', mimeType: data.mimeType, size: data.size },
      select: fileSelect,
    });
  }

  async delete(id: number): Promise<void> {
    await this.db.file.delete({ where: { id } });
  }
}
