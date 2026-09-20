import { describe, expect, it } from 'vitest';
import {
  asRateInput,
  countryByName,
  countryOptions,
  formatRate,
  isCurrency,
  isTimezone,
  minorDigitsOf,
  toMinorUnits,
  toTypedAmount,
} from './location-options.ts';

describe('countryOptions', () => {
  it('lists ISO countries by their English names, alphabetically', () => {
    const list = countryOptions();
    expect(list.length).toBeGreaterThan(240);
    expect(list.find((country) => country.code === 'AT')?.name).toBe('Austria');
    const names = list.map((country) => country.name);
    expect([...names].sort((a, b) => a.localeCompare(b, 'en'))).toEqual(names);
  });

  it('has no groupings or placeholders a person could not live in', () => {
    const codes = countryOptions().map((country) => country.code);
    for (const code of ['EU', 'UN', 'ZZ', 'XA']) expect(codes).not.toContain(code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('finds a country by name whatever the case', () => {
    expect(countryByName('  austria ')?.code).toBe('AT');
    expect(countryByName('Atlantis')).toBeUndefined();
    expect(countryByName('')).toBeUndefined();
  });
});

describe('timezones and currencies', () => {
  it.each([
    ['Europe/Vienna', true],
    ['Asia/Karachi', true],
    ['UTC', true],
    ['Mars/Olympus', false],
  ])('treats timezone %s as %s', (zone, expected) => {
    expect(isTimezone(zone)).toBe(expected);
  });

  it.each([
    ['EUR', true],
    ['PKR', true],
    ['eur', false],
    ['EURO', false],
    ['ABC', false],
  ])('treats currency %s as %s', (code, expected) => {
    expect(isCurrency(code)).toBe(expected);
  });
});

describe('formatRate', () => {
  it.each([
    ['14000', 'EUR', '€140.00'],
    ['500', 'JPY', '¥500'],
    ['999999999999999', 'EUR', '€9,999,999,999,999.99'],
  ])('reads %s %s as %s', (amount, currency, expected) => {
    // JPY has no minor unit, so its 500 is 500 — dividing by 100 would be wrong.
    expect(formatRate(amount, currency)).toBe(expected);
  });

  it.each([
    ['', 'EUR'],
    ['140.00', 'EUR'],
    ['14000', ''],
    ['14000', 'EURO'],
  ])('has nothing to say for %j in %j', (amount, currency) => {
    expect(formatRate(amount, currency)).toBeNull();
  });
});

/**
 * Rates are typed the way they are spoken and stored the way the API stores
 * them, and the two are a hundred apart — or one, or a thousand, depending on
 * the currency. A field that took minor units meant someone typing 85 into a
 * box marked "$" priced their hour at eighty-five cents.
 */
describe('what a rate is typed in, and what is stored', () => {
  it('knows how many minor units a currency has', () => {
    expect(minorDigitsOf('USD')).toBe(2);
    expect(minorDigitsOf('JPY')).toBe(0);
    expect(minorDigitsOf('KWD')).toBe(3);
    // An unknown or half-typed code falls back to the common case rather than
    // throwing while somebody is still typing it.
    expect(minorDigitsOf('US')).toBe(2);
  });

  it('converts what was typed into whole minor units', () => {
    expect(toMinorUnits('85', 'USD')).toBe('8500');
    expect(toMinorUnits('85.50', 'USD')).toBe('8550');
    expect(toMinorUnits('85.5', 'USD')).toBe('8550');
    expect(toMinorUnits('0.99', 'USD')).toBe('99');
    // No minor unit to convert into, and three of them.
    expect(toMinorUnits('8500', 'JPY')).toBe('8500');
    expect(toMinorUnits('85.5', 'KWD')).toBe('85500');
  });

  it('treats an empty or zero rate as no rate at all', () => {
    expect(toMinorUnits('', 'USD')).toBeNull();
    expect(toMinorUnits('   ', 'USD')).toBeNull();
    expect(toMinorUnits('0', 'USD')).toBeNull();
    expect(toMinorUnits('0.00', 'USD')).toBeNull();
    expect(toMinorUnits('nonsense', 'USD')).toBeNull();
  });

  it('fills the field back in from what was saved', () => {
    expect(toTypedAmount('8500', 'USD')).toBe('85');
    expect(toTypedAmount('8550', 'USD')).toBe('85.5');
    expect(toTypedAmount('99', 'USD')).toBe('0.99');
    expect(toTypedAmount('8500', 'JPY')).toBe('8500');
    expect(toTypedAmount('85500', 'KWD')).toBe('85.5');
  });

  it('round-trips, which is the property that matters', () => {
    for (const [typed, currency] of [
      ['85', 'USD'],
      ['85.50', 'USD'],
      ['0.99', 'USD'],
      ['8500', 'JPY'],
      ['85.5', 'KWD'],
    ] as const) {
      const stored = toMinorUnits(typed, currency);
      expect(stored).not.toBeNull();
      expect(Number(toTypedAmount(stored as string, currency))).toBe(Number(typed));
    }
  });

  it('accepts a half-typed amount without correcting it under the caret', () => {
    expect(asRateInput('85', 'USD')).toBe('85');
    expect(asRateInput('85.', 'USD')).toBe('85.');
    expect(asRateInput('85.5', 'USD')).toBe('85.5');
    // More places than the currency has, a second separator, and letters.
    expect(asRateInput('85.999', 'USD')).toBe('85.99');
    expect(asRateInput('85.5.5', 'USD')).toBe('85.55');
    expect(asRateInput('$85', 'USD')).toBe('85');
    // A currency with no minor unit has nowhere to put the fraction, so it is
    // dropped rather than run into the whole part — which would be ten times
    // the amount, not a rounding.
    expect(asRateInput('85.5', 'JPY')).toBe('85');
  });
});
