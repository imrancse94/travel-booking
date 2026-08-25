import { prisma } from '../config/prisma.js';

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
  const row = await prisma.setting.findFirst({ where: { key, agencyId } });
  if (row) return row.value;
  if (agencyId) {
    const global = await prisma.setting.findFirst({ where: { key, agencyId: null } });
    if (global) return global.value;
  }
  return DEFAULTS[key] ?? null;
}

export async function getSettings(agencyId = null) {
  const rows = await prisma.setting.findMany({ where: { OR: [{ agencyId }, { agencyId: null }] } });
  const merged = { ...DEFAULTS };
  for (const row of rows) merged[row.key] = row.value;
  return merged;
}

export async function setSetting(key, value, agencyId = null) {
  return prisma.setting.upsert({
    where: { agencyId_key: { agencyId, key } },
    update: { value },
    create: { agencyId, key, value },
  });
}
