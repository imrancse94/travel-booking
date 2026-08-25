// Small date-range helpers shared by dashboardService/reportService for
// day-boundary filters and time-series bucketing. UTC-based so they line up
// with Prisma's @db.Date columns (checkIn/checkOut), which store midnight UTC.

export function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date = new Date()) {
  const d = startOfDay(date);
  d.setUTCDate(d.getUTCDate() + 1);
  return d;
}

export function addDays(date, days) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export function toDayKey(date) {
  return new Date(date).toISOString().slice(0, 10);
}

// Builds the last `days` day-keys (oldest first) ending today, so a
// time-series can be zero-filled for days with no matching rows.
export function lastNDayKeys(days) {
  const keys = [];
  const today = startOfDay();
  for (let i = days - 1; i >= 0; i -= 1) {
    keys.push(toDayKey(addDays(today, -i)));
  }
  return keys;
}
