import { and, count, desc, eq, gte, lte } from 'drizzle-orm';
import { db } from '../db/index.js';
import { commissions } from '../db/schema.js';

// The shape Prisma's `include` produced, so API responses are unchanged.
const withAgentAndBooking = {
  agent: { columns: { id: true, firstName: true, lastName: true, email: true } },
  booking: { columns: { id: true, bookingNumber: true, totalAmount: true, currency: true } },
};

export async function findById(id) {
  const row = await db.query.commissions.findFirst({
    where: eq(commissions.id, id),
    with: withAgentAndBooking,
  });
  return row ?? null;
}

function buildWhere({ agentId, status, bookingId, dateFrom, dateTo }) {
  const filters = [
    agentId ? eq(commissions.agentId, agentId) : null,
    status ? eq(commissions.status, status) : null,
    bookingId ? eq(commissions.bookingId, bookingId) : null,
    dateFrom ? gte(commissions.createdAt, new Date(dateFrom)) : null,
    dateTo ? lte(commissions.createdAt, new Date(dateTo)) : null,
  ].filter(Boolean);
  return filters.length ? and(...filters) : undefined;
}

export async function list({ limit, skip, ...filters }) {
  const where = buildWhere(filters);

  const [items, [{ value: total }]] = await Promise.all([
    db.query.commissions.findMany({
      where,
      with: withAgentAndBooking,
      orderBy: desc(commissions.createdAt),
      limit,
      offset: skip,
    }),
    db.select({ value: count() }).from(commissions).where(where),
  ]);

  return { items, total };
}

export async function create(data) {
  const [created] = await db.insert(commissions).values(data).returning();
  return findById(created.id);
}

export async function updateStatus(id, data) {
  const [updated] = await db.update(commissions).set(data).where(eq(commissions.id, id)).returning();
  return updated ? findById(updated.id) : null;
}
