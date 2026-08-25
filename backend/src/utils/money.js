import { Prisma } from '@prisma/client';

// Wrapper around Prisma's bundled decimal.js so all monetary arithmetic in
// services goes through a fixed-point Decimal instead of JS floats.
export const Money = Prisma.Decimal;

export function toDecimal(value) {
  return new Money(value ?? 0);
}

export function sum(values) {
  return values.reduce((acc, v) => acc.plus(toDecimal(v)), new Money(0));
}

export function roundCurrency(value) {
  return toDecimal(value).toDecimalPlaces(2);
}
