import { db } from '../db/index.js';
import { auditLogs } from '../db/schema.js';
import logger from '../config/logger.js';

export async function recordAudit({ req, userId, action, entity, entityId, oldValue, newValue }) {
  try {
    await db.insert(auditLogs).values({
        userId: userId ?? req?.user?.id ?? null,
        action,
        entity,
        entityId: entityId ? String(entityId) : null,
        oldValue: oldValue ?? undefined,
        newValue: newValue ?? undefined,
        ipAddress: req?.ip,
        userAgent: req?.headers?.['user-agent'],
      });
  } catch (err) {
    // Auditing must never break the primary business transaction.
    logger.error({ err, action, entity, entityId }, 'Failed to record audit log');
  }
}
