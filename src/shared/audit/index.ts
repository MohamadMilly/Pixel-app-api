import { prisma } from '../database/prisma.js';
import { domainEvents } from '../events/domain-events.js';
import { PrismaAuditRepository } from './audit.repository.js';
import { AuditService } from './audit.service.js';
import { registerAuditSubscriber } from './audit.subscriber.js';

export type { AuditLogRow, AuditRepository } from './audit.repository.js';
export type { AuditRecorder } from './audit.types.js';
export { AuditService } from './audit.service.js';

export const auditRepository = new PrismaAuditRepository(prisma);
export const auditService = new AuditService(auditRepository);

let subscribed = false;
/** Idempotently wire the audit log to the domain-event bus. Called once at startup. */
export function initAudit(): void {
  if (subscribed) return;
  registerAuditSubscriber(domainEvents, auditService);
  subscribed = true;
}
