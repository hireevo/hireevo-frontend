import { describe, expect, it } from 'vitest';
import { EMPTY_LOCATION, validateLocation } from './use-location-draft.ts';

const filled = {
  country: 'Austria',
  city: 'Vienna',
  serviceArea: 'Remote across Europe',
  timezone: 'Europe/Vienna',
  remoteMode: 'remote',
  rateCurrency: 'EUR',
  rateAmountMinor: '14000',
};

describe('validateLocation', () => {
  it('accepts an empty step, because every field is optional', () => {
    expect(validateLocation(EMPTY_LOCATION)).toEqual({});
  });

  it('accepts a step filled with real values', () => {
    expect(validateLocation(filled)).toEqual({});
  });

  it('refuses a country, timezone or currency that is not one', () => {
    expect(
      validateLocation({
        ...filled,
        country: 'Atlantis',
        timezone: 'Mars/Olympus',
        rateCurrency: 'ABC',
      }),
    ).toEqual({
      country: 'Choose a country from the list.',
      timezone: 'Choose a timezone from the list, for example Europe/Vienna.',
      rateCurrency: 'Use a three-letter currency code, for example EUR.',
    });
  });

  it('asks for the currency a rate is in', () => {
    expect(validateLocation({ ...EMPTY_LOCATION, rateAmountMinor: '14000' })).toEqual({
      rateCurrency: 'Add the currency this rate is in.',
    });
  });
});
