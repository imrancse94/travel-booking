// Generates human-friendly, unique booking numbers like BK-2026-000001.
//
// Must be called from inside the same Prisma transaction that creates the
// booking row. We take a Postgres advisory transaction lock keyed by
// "<prefix>:<year>" so concurrent transactions serialize around the counter
// instead of racing on the same next number; the lock is released
// automatically when the transaction commits or rolls back.

function adviserKey(namespace) {
  // hashtextextended returns a bigint hash of the string -> stable per-namespace lock id.
  return namespace;
}

export async function generateSequentialNumber(tx, { prefix, namespace, year = new Date().getFullYear(), digits = 6 }) {
  const lockNamespace = adviserKey(`${namespace}:${year}`);
  await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', lockNamespace);

  const yearStart = new Date(Date.UTC(year, 0, 1));
  const yearEnd = new Date(Date.UTC(year + 1, 0, 1));

  const count = await tx[namespace].count({
    where: { createdAt: { gte: yearStart, lt: yearEnd } },
  });

  const sequence = String(count + 1).padStart(digits, '0');
  return `${prefix}-${year}-${sequence}`;
}

export async function generateBookingNumber(tx) {
  return generateSequentialNumber(tx, { prefix: 'BK', namespace: 'booking' });
}

export async function generateTourBookingNumber(tx) {
  return generateSequentialNumber(tx, { prefix: 'TB', namespace: 'tourBooking' });
}

export async function generateInvoiceNumber(tx) {
  return generateSequentialNumber(tx, { prefix: 'INV', namespace: 'invoice' });
}
