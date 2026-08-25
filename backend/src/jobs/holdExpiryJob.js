import logger from '../config/logger.js';
import { releaseExpiredHolds } from '../services/bookingService.js';

const SWEEP_INTERVAL_MS = 60 * 1000;

// Polls for HELD bookings whose hold has expired and releases them back to
// AVAILABLE (by moving the booking to `cancelled`, which the availability
// overlap check already excludes). A dedicated queue (BullMQ, etc.) would be
// the next step at higher volume; a simple interval is sufficient here and
// keeps the dependency footprint small.
export function startBookingHoldSweeper() {
  const timer = setInterval(async () => {
    try {
      const released = await releaseExpiredHolds();
      if (released > 0) {
        logger.info({ released }, 'Released expired room holds');
      }
    } catch (err) {
      logger.error({ err }, 'Hold expiry sweep failed');
    }
  }, SWEEP_INTERVAL_MS);

  timer.unref();
  return () => clearInterval(timer);
}
