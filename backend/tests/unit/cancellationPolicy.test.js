import { describe, it, expect } from '@jest/globals';
import { calculateCancellation } from '../../src/services/bookingService.js';

// Pure date-math + Money arithmetic -- no DB needed. Mirrors the policy
// described in instructions.md section 18: free 7+ days out, 50% charge
// inside that window, 100% inside 24h.
const SETTINGS = {
  cancellation_free_days: 7,
  cancellation_partial_percent: 50,
  cancellation_full_within_hours: 24,
};

function bookingCheckingIn(hoursFromNow, totalAmount = '200', paidAmount = '200') {
  return {
    checkIn: new Date(Date.now() + hoursFromNow * 60 * 60 * 1000),
    totalAmount,
    paidAmount,
  };
}

describe('cancellation fee policy', () => {
  it('is free when the stay is more than 7 days out', async () => {
    const { cancellationFee, refundableAmount, feePercent } = await calculateCancellation(
      bookingCheckingIn(10 * 24),
      SETTINGS
    );
    expect(feePercent).toBe(0);
    expect(cancellationFee.toString()).toBe('0');
    expect(refundableAmount.toString()).toBe('200');
  });

  it('charges 50% between 24 hours and 7 days out', async () => {
    const { cancellationFee, refundableAmount, feePercent } = await calculateCancellation(
      bookingCheckingIn(3 * 24),
      SETTINGS
    );
    expect(feePercent).toBe(50);
    expect(cancellationFee.toString()).toBe('100');
    expect(refundableAmount.toString()).toBe('100');
  });

  it('charges 100% inside the 24-hour window', async () => {
    const { cancellationFee, refundableAmount, feePercent } = await calculateCancellation(bookingCheckingIn(5), SETTINGS);
    expect(feePercent).toBe(100);
    expect(cancellationFee.toString()).toBe('200');
    expect(refundableAmount.toString()).toBe('0');
  });

  it('charges 100% for a stay that has already started (negative hours)', async () => {
    const { feePercent } = await calculateCancellation(bookingCheckingIn(-2), SETTINGS);
    expect(feePercent).toBe(100);
  });

  it('never returns a negative refundable amount when paidAmount is less than the fee', async () => {
    const { refundableAmount } = await calculateCancellation(bookingCheckingIn(5, '200', '50'), SETTINGS);
    expect(refundableAmount.toString()).toBe('0');
  });
});
