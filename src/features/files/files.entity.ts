export const FileStatus = { PENDING: 'PENDING', CHECKED: 'CHECKED' } as const;
export type FileStatus = (typeof FileStatus)[keyof typeof FileStatus];

export const ALLOWED_FILE_MIME = 'application/pdf';

export interface FileEntity {
  readonly id: number;
  readonly path: string;
  readonly status: FileStatus;
  readonly mimeType: string | null;
  readonly size: number | null;
  readonly createdAt: Date;
}
