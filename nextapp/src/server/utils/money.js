import Decimal from 'decimal.js';

// Fixed-point arithmetic for every monetary value, so nothing goes through a
// JS float. This was `Prisma.Decimal`, which is this same library re-exported
// by Prisma -- swapping to it directly is behaviour-preserving and removes the
// last reason for the money helpers to know about the ORM at all.
export const Money = Decimal;

export function toDecimal(value) {
  return new Money(value ?? 0);
}

export function sum(values) {
  return values.reduce((acc, v) => acc.plus(toDecimal(v)), new Money(0));
}

export function roundCurrency(value) {
  return toDecimal(value).toDecimalPlaces(2);
}
