import { env } from '../../config/env.js';
import type { AdminAuthContext } from '../../shared/auth/index.js';
import { BadRequestError, ConflictError, NotFoundError } from '../../shared/errors/index.js';
import { newBookFilePath, type StoragePort } from '../../shared/storage/index.js';
import { hasPdfMagic, PDF_MAGIC_LENGTH } from '../../shared/storage/magic-bytes.js';
import type { VirusScanner } from '../../shared/security/virus-scan.js';
import { presentFile, type FileView, type UploadTargetView } from './files.dto.js';
import { ALLOWED_FILE_MIME, type FileEntity } from './files.entity.js';
import type { FilesRepository } from './files.repository.js';

/**
 * File lifecycle. All methods are admin-only (typed AdminAuthContext) — the compiler
 * blocks non-admin callers on top of the route guard.
 */
export class FilesService {
  constructor(
    private readonly repository: FilesRepository,
    private readonly storage: StoragePort,
    private readonly virusScanner: VirusScanner,
  ) {}

  /** Issue a pre-signed upload URL and create a PENDING file row. */
  async createUploadTarget(_admin: AdminAuthContext): Promise<UploadTargetView> {
    const path = newBookFilePath();
    const target = await this.storage.createSignedUploadUrl(path, env.UPLOAD_URL_TTL_SECONDS);
    const file = await this.repository.createPending(target.path);
    return {
      fileId: file.id,
      path: file.path,
      uploadUrl: target.uploadUrl,
      token: target.token,
      expiresIn: env.UPLOAD_URL_TTL_SECONDS,
    };
  }

  /**
   * Verify an uploaded object: it must exist, be within the size limit, be a PDF, and
   * pass the virus scan. On success the row flips to CHECKED. On any failure the object
   * and the PENDING row are removed so no unverified file can ever be linked to a book.
   */
  async verify(_admin: AdminAuthContext, fileId: number): Promise<FileView> {
    const file = await this.getExistingOrThrow(fileId);
    if (file.status === 'CHECKED') {
      return presentFile(file); // idempotent
    }

    const info = await this.storage.getObjectInfo(file.path);
    if (!info) {
      throw new ConflictError('No uploaded object found for this file yet', 'FILE_NOT_UPLOADED');
    }

    if (info.size <= 0 || info.size > env.MAX_UPLOAD_BYTES) {
      await this.discard(file);
      throw new BadRequestError(
        `File size ${info.size} is outside the allowed range (1..${env.MAX_UPLOAD_BYTES} bytes)`,
        'FILE_TOO_LARGE',
      );
    }
    if (info.mimeType !== ALLOWED_FILE_MIME) {
      await this.discard(file);
      throw new BadRequestError(`Only ${ALLOWED_FILE_MIME} files are allowed`, 'INVALID_FILE_TYPE');
    }

    // Verify the REAL file type by its magic bytes, not just the reported mime
    // (a client can upload a non-PDF with a spoofed content-type).
    const header = await this.storage.getObjectBytes(file.path, PDF_MAGIC_LENGTH);
    if (!header || !hasPdfMagic(header)) {
      await this.discard(file);
      throw new BadRequestError('File content is not a valid PDF', 'INVALID_FILE_CONTENT');
    }

    const scan = await this.virusScanner.scan(file.path);
    if (!scan.clean) {
      await this.discard(file);
      throw new BadRequestError('File failed the virus scan', 'FILE_INFECTED');
    }

    return presentFile(await this.repository.markChecked(file.id, { mimeType: info.mimeType, size: info.size }));
  }

  private async discard(file: FileEntity): Promise<void> {
    // Best-effort cleanup; never mask the original validation error.
    await this.storage.removeObject(file.path).catch(() => undefined);
    await this.repository.delete(file.id).catch(() => undefined);
  }

  private async getExistingOrThrow(fileId: number): Promise<FileEntity> {
    const file = await this.repository.findById(fileId);
    if (!file) throw new NotFoundError('File');
    return file;
  }
}
