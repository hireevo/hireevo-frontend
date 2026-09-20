import { describe, expect, it } from 'vitest';
import { EMPTY_LOCATION, validateLocation } from './use-location-draft.ts';

const filled = {
  country: 'Austria',
  city: 'Vienna',
  serviceArea: 'Remote across Europe',
  timezone: 'Europe/Vienna',
  remoteMode: 'remote',
  rateAmountMinor: '140',
  ratePeriod: 'weekly',
};

describe('validateLocation', () => {
  it('accepts an empty step, because every field is optional', () => {
    expect(validateLocation(EMPTY_LOCATION)).toEqual({});
  });

  it('accepts a step filled with real values', () => {
    expect(validateLocation(filled)).toEqual({});
  });

  it('refuses a country or timezone that is not one', () => {
    expect(validateLocation({ ...filled, country: 'Atlantis', timezone: 'Mars/Olympus' })).toEqual({
      country: 'Choose a country from the list.',
      timezone: 'Choose a timezone from the list, for example Europe/Vienna.',
    });
  });

  /**
   * The amount and its period are one fact, and the column holding them refuses
   * half of it. Caught here so the person is told which half is missing rather
   * than being handed the constraint's answer after a round trip.
   */
  it('asks what a rate covers, and what a period is worth', () => {
    expect(validateLocation({ ...EMPTY_LOCATION, rateAmountMinor: '140' })).toEqual({
      ratePeriod: 'Choose what the rate covers.',
    });
    expect(validateLocation({ ...EMPTY_LOCATION, ratePeriod: 'weekly' })).toEqual({
      rateAmountMinor: 'Add an amount for the rate.',
    });
  });
});
