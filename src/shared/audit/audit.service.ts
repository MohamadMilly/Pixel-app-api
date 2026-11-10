import type { AuditRepository } from './audit.repository.js';
import type { AuditEntryInput, AuditRecorder } from './audit.types.js';

/**
 * Fire-and-forget audit recorder. Writing an audit row must never fail or slow the
 * action being audited, so errors are logged and swallowed. (If you need guaranteed
 * audit durability for a specific action, await repository.create inside that action's
 * own transaction instead.)
 */
export class AuditService implements AuditRecorder {
  constructor(private readonly repository: AuditRepository) {}

  record(entry: AuditEntryInput): void {
    this.repository.create(entry).catch((error: unknown) => {
      console.error(`[audit] failed to record "${entry.action}"`, error);
    });
  }
}
