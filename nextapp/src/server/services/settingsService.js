import { and, asc, eq, isNull, or } from 'drizzle-orm';
import { db } from '../db/index.js';
import { agencies, settings } from '../db/schema.js';

const DEFAULTS = {
  tax_rate_percent: 0,
  default_commission_percent: 0,
  currency: 'USD',
  timezone: 'UTC',
  agency_name: 'Global Travel Agency',
  agency_logo_url: null,
  agency_favicon_url: null,
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

/**
 * The keys any visitor may see: the branding the app renders in its header and
 * the formatting it needs for prices and dates. Deliberately a whitelist --
 * commission rates and cancellation thresholds are internal, so a new setting
 * is private until it is named here.
 */
const PUBLIC_KEYS = ['agency_name', 'agency_logo_url', 'agency_favicon_url', 'currency', 'timezone'];

export async function getPublicSettings(agencyId = null) {
  // There is no agencies.routes.js and every seeded user carries the same
  // fixed agencyId (see seeds/index.js) -- the schema allows multiple
  // agencies, but nothing in the app creates a second one, so this is a
  // single-tenant deployment. A public visitor is not signed in and so has no
  // agencyId of their own; falling back to the null-agency defaults would show
  // the branding as unset even after Settings had been saved. Resolving to the
  // one agency that exists keeps public and authenticated views consistent.
  const resolvedAgencyId = agencyId ?? (await firstAgencyId());
  const all = await getSettings(resolvedAgencyId);
  return Object.fromEntries(PUBLIC_KEYS.map((key) => [key, all[key]]));
}

async function firstAgencyId() {
  const [agency] = await db.select({ id: agencies.id }).from(agencies).orderBy(asc(agencies.createdAt)).limit(1);
  return agency?.id ?? null;
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
