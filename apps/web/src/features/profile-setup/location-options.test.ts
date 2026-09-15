import { describe, expect, it } from 'vitest';
import {
  countryByName,
  countryOptions,
  formatRate,
  isCurrency,
  isTimezone,
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
