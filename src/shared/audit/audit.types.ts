import type { Prisma, UserRole } from '../../generated/prisma/client.js';

export interface AuditEntryInput {
  readonly action: string;
  readonly actorAccountId?: number | undefined;
  readonly actorRole?: UserRole | undefined;
  readonly targetType?: string | undefined;
  readonly targetId?: string | number | undefined;
  readonly metadata?: Prisma.InputJsonValue | undefined;
  readonly ip?: string | undefined;
}

export interface AuditRecorder {
  record(entry: AuditEntryInput): void;
}
