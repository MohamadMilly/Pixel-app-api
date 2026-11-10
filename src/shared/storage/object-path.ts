import { randomUUID } from 'node:crypto';

/** Build a collision-free object key for a new book PDF. */
export function newBookFilePath(): string {
  const now = new Date();
  const yyyyMm = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  return `books/${yyyyMm}/${randomUUID()}.pdf`;
}
