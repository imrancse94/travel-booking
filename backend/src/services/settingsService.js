import { and, eq, isNull, or } from 'drizzle-orm';
import { db } from '../db/index.js';
import { settings } from '../db/schema.js';

const DEFAULTS = {
  tax_rate_percent: 0,
  default_commission_percent: 0,
  currency: 'USD',
  timezone: 'UTC',
  agency_name: 'Global Travel Agency',
  agency_logo_url: null,
  cancellation_free_days: 7,
  cancellation_partial_days: 3,
  cancellation_partial_percent: 50,
  cancellation_full_within_hours: 24,
};

export async function getSetting(key, agencyId = null) {
  const [row] = await db
    .select()
    .from(settings)
    .where(and(eq(settings.key, key), agencyId ? eq(settings.agencyId, agencyId) : isNull(settings.agencyId)))
    .limit(1);
  if (row) return row.value;
  if (agencyId) {
    const [global] = await db
      .select()
      .from(settings)
      .where(and(eq(settings.key, key), isNull(settings.agencyId)))
      .limit(1);
    if (global) return global.value;
  }
  return DEFAULTS[key] ?? null;
}

export async function getSettings(agencyId = null) {
  const rows = await db
    .select()
    .from(settings)
    .where(agencyId ? or(eq(settings.agencyId, agencyId), isNull(settings.agencyId)) : isNull(settings.agencyId));
  const merged = { ...DEFAULTS };
  for (const row of rows) merged[row.key] = row.value;
  return merged;
}

export async function setSetting(key, value, agencyId = null) {
  // Prisma's upsert on the (agencyId, key) unique pair.
  const [row] = await db
    .insert(settings)
    .values({ agencyId, key, value })
    .onConflictDoUpdate({ target: [settings.agencyId, settings.key], set: { value } })
    .returning();
  return row;
}
