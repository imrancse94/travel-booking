import { and, count, desc, eq, gte, lte } from 'drizzle-orm';
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

/** GET /reports/audit-logs -- the audit trail with entity/user/date filters. */
export async function listAuditLogs({ entity, entityId, userId, dateFrom, dateTo, limit, skip }) {
  const filters = [
    entity ? eq(auditLogs.entity, entity) : null,
    entityId ? eq(auditLogs.entityId, entityId) : null,
    userId ? eq(auditLogs.userId, userId) : null,
    dateFrom ? gte(auditLogs.createdAt, new Date(dateFrom)) : null,
    dateTo ? lte(auditLogs.createdAt, new Date(dateTo)) : null,
  ].filter(Boolean);
  const where = filters.length ? and(...filters) : undefined;

  const [items, [{ value: total }]] = await Promise.all([
    db.query.auditLogs.findMany({
      where,
      with: { user: { columns: { id: true, firstName: true, lastName: true, email: true } } },
      orderBy: desc(auditLogs.createdAt),
      limit,
      offset: skip,
    }),
    db.select({ value: count() }).from(auditLogs).where(where),
  ]);

  return { items, total };
}
