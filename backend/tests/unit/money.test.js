import { describe, it, expect } from '@jest/globals';
import { Money, sum, roundCurrency, toDecimal } from '../../src/utils/money.js';

describe('money utils', () => {
  it('never loses cents to floating point error', () => {
    // The classic 0.1 + 0.2 !== 0.3 float trap -- Money must not have it.
    const total = new Money('0.10').plus(new Money('0.20'));
    expect(total.toString()).toBe('0.3');
  });

  it('sums an array of string/number amounts', () => {
    expect(sum(['10.50', '2.25', 0]).toString()).toBe('12.75');
  });

  it('sum() of an empty array is zero', () => {
    expect(sum([]).toString()).toBe('0');
  });

  it('roundCurrency rounds to 2 decimal places', () => {
    expect(roundCurrency(new Money('19.995')).toString()).toBe('20');
    expect(roundCurrency(new Money('19.994')).toString()).toBe('19.99');
  });

  it('toDecimal defaults nullish input to zero', () => {
    expect(toDecimal(undefined).toString()).toBe('0');
    expect(toDecimal(null).toString()).toBe('0');
  });
});
