import { NotFoundError, ValidationError } from '../utils/errors.js';
import { Money, sum, roundCurrency } from '../utils/money.js';

const BASE_OCCUPANCY_ADULTS = 2;
const BASE_OCCUPANCY_CHILDREN = 0;

export function nightsBetween(checkIn, checkOut) {
  const ms = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

function toDateOnly(date) {
  const d = new Date(date);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/**
 * Finds the best-matching RoomRate for a single calendar night.
 * "Best" = highest `priority`, then the most recently created rate, among
 * rows whose [startDate, endDate) window contains the night.
 */
function pickRateForNight(rates, night) {
  const candidates = rates.filter((rate) => rate.startDate <= night && night < rate.endDate);
  if (candidates.length === 0) return null;
  // Higher `priority` wins (e.g. a promotional override beats the standard
  // rate). Ties fall back to the cheapest rate so an unspecified rate plan
  // never silently books the guest into the most expensive option.
  candidates.sort((a, b) => b.priority - a.priority || Number(a.price) - Number(b.price));
  return candidates[0];
}

/**
 * Recalculates the authoritative price for one room over a stay, night by
 * night, from server-side rate data. Never trust a price sent by the client.
 */
export async function calculateRoomStayPrice({ tx, roomTypeId, ratePlanId, checkIn, checkOut, adults, children }) {
  const nights = nightsBetween(checkIn, checkOut);
  if (nights < 1) {
    throw new ValidationError('Check-out date must be after check-in date');
  }

  const rates = await tx.roomRate.findMany({
    where: { roomTypeId, ...(ratePlanId ? { ratePlanId } : {}) },
  });

  if (rates.length === 0) {
    throw new NotFoundError('No pricing configured for this room type in the requested period');
  }

  const nightly = [];
  let currency = null;

  for (let i = 0; i < nights; i += 1) {
    const night = toDateOnly(new Date(new Date(checkIn).getTime() + i * 86400000));
    const rate = pickRateForNight(rates, night);
    if (!rate) {
      throw new NotFoundError(`No rate available for ${night.toISOString().slice(0, 10)}`);
    }
    currency ??= rate.currency;

    const extraAdults = Math.max(0, adults - BASE_OCCUPANCY_ADULTS);
    const extraChildren = Math.max(0, children - BASE_OCCUPANCY_CHILDREN);

    const base = new Money(rate.price);
    const extra = new Money(rate.extraAdultPrice).times(extraAdults).plus(new Money(rate.extraChildPrice).times(extraChildren));
    const nightTotal = base.plus(extra);

    nightly.push({
      date: night.toISOString().slice(0, 10),
      ratePlanId: rate.ratePlanId,
      basePrice: roundCurrency(base),
      extraOccupancyPrice: roundCurrency(extra),
      total: roundCurrency(nightTotal),
    });
  }

  const totalPrice = roundCurrency(sum(nightly.map((n) => n.total)));
  const averageRatePerNight = roundCurrency(totalPrice.dividedBy(nights));

  return { nights, currency: currency || 'USD', nightly, ratePerNight: averageRatePerNight, totalPrice };
}
