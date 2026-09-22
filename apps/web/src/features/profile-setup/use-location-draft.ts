'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ProfileField, ProfileValues, RatePeriod, RateValue } from './api.ts';
import { RATE_CURRENCY } from './api.ts';
import { asRateInput, countryByCode, countryByName, isTimezone } from './location-options.ts';

export const LOCATION_FIELDS = [
  'country',
  'city',
  'serviceArea',
  'timezone',
  'remoteMode',
  'rateAmountMinor',
  'ratePeriod',
] as const;

export type LocationField = (typeof LOCATION_FIELDS)[number];
export type LocationValues = Record<LocationField, string>;
export type LocationErrors = Partial<Record<LocationField, string>>;

export const EMPTY_LOCATION: LocationValues = {
  country: '',
  city: '',
  serviceArea: '',
  timezone: '',
  remoteMode: '',
  rateAmountMinor: '',
  ratePeriod: '',
};

/**
 * Which profile field each one of these is stored in.
 *
 * The country is absent because it is typed by name and stored as a code, and
 * the two rate fields because a price is not a profile field any more: it is
 * one entry in the list of prices, and it is carried separately below.
 */
const PROFILE_FIELD: Record<
  Exclude<LocationField, 'country' | 'rateAmountMinor' | 'ratePeriod'>,
  ProfileField
> = {
  city: 'locationCity',
  serviceArea: 'serviceArea',
  timezone: 'timezone',
  remoteMode: 'remoteMode',
};

/** Every field is optional; what is filled in has to be a real value. */
export function validateLocation(values: LocationValues): LocationErrors {
  const errors: LocationErrors = {};
  if (values.country.trim() !== '' && countryByName(values.country) === undefined) {
    errors.country = 'Choose a country from the list.';
  }
  if (values.timezone.trim() !== '' && !isTimezone(values.timezone.trim())) {
    errors.timezone = 'Choose a timezone from the list, for example Europe/Vienna.';
  }
  // The amount and its period are one fact, and the API refuses half of it.
  if (values.rateAmountMinor !== '' && values.ratePeriod === '') {
    errors.ratePeriod = 'Choose what the rate covers.';
  } else if (values.ratePeriod !== '' && values.rateAmountMinor === '') {
    errors.rateAmountMinor = 'Add an amount for the rate.';
  }
  return errors;
}

/** Keeps the two constrained fields in shape as they are typed. */
function normalise(field: LocationField, value: string): string {
  if (field === 'rateAmountMinor') return asRateInput(value, RATE_CURRENCY);
  return value;
}

/**
 * The Location and rate step, over the profile the page is editing.
 *
 * Six of its seven fields are profile fields under another name, so they are
 * read from and written to the draft directly — there is no second copy here to
 * fall behind the one that gets saved.
 *
 * The seventh is the country, which the API stores as its ISO code and the
 * field shows by name. The name being typed lives here until it matches a
 * country; the code is what the draft holds. A name that never matches is
 * caught when the step is submitted, and the field is left empty on the server
 * rather than saved as something the API would reject.
 *
 * Fields are checked when the step is submitted; an error clears as soon as its
 * field is edited. Nothing is validated on leaving a field: an error appearing
 * then pushes the page down under the pointer, so the click that left the field
 * — on Save and next, or Publish — lands beside its button and is lost.
 */
export function useLocationDraft(
  draft: {
    values: ProfileValues;
    change: (field: ProfileField, value: string) => void;
  },
  /**
   * The prices and how to change them.
   *
   * Setting up a profile asks for one price — the headline one — and the client
   * profile page is where the rest are added. So this step edits the first
   * entry of the list and leaves any others alone, rather than holding a second
   * copy of a price that the profile page would then disagree with.
   */
  prices: { rates: RateValue[]; onRates: (rates: RateValue[]) => void },
) {
  const code = draft.values.locationCountry;
  const [country, setCountry] = useState(() => countryByCode(code)?.name ?? '');
  const [errors, setErrors] = useState<LocationErrors>({});
  // The code this field last put there itself. A code that changes for any
  // other reason — the profile loading, or a reload after a conflict — is a new
  // answer from the server, and the name being shown follows it.
  const written = useRef(code);

  useEffect(() => {
    if (code === written.current) return;
    written.current = code;
    setCountry(countryByCode(code)?.name ?? '');
  }, [code]);

  const { locationCity, serviceArea, timezone, remoteMode } = draft.values;

  // The step's own copy of the one price it edits, because half a price is
  // something a person can have typed and the list cannot hold: an amount with
  // no period yet is still what is in the box, and clearing it under the caret
  // is a field fighting the person using it.
  const stored = prices.rates[0];
  const [rate, setRate] = useState<{ amount: string; period: RatePeriod | '' }>({
    amount: stored?.amount ?? '',
    period: stored?.period ?? '',
  });
  // A price that changes for another reason — the profile loading, or a reload
  // after a conflict — is a new answer from the server, and the boxes follow it.
  const fromServer = useRef(stored);
  useEffect(() => {
    if (stored === fromServer.current) return;
    fromServer.current = stored;
    setRate({ amount: stored?.amount ?? '', period: stored?.period ?? '' });
  }, [stored]);

  const rateAmountMinor = rate.amount;
  const ratePeriod = rate.period;

  // Built once per change rather than once per render: what depends on it —
  // checking the step — would otherwise be rebuilt every time anything else on
  // the page did.
  const values: LocationValues = useMemo(
    () => ({
      country,
      city: locationCity,
      serviceArea,
      timezone,
      remoteMode,
      rateAmountMinor,
      ratePeriod,
    }),
    [country, locationCity, serviceArea, timezone, remoteMode, rateAmountMinor, ratePeriod],
  );

  const { change: changeProfile } = draft;

  const { rates, onRates } = prices;

  const change = useCallback(
    (field: LocationField, value: string) => {
      const typed = normalise(field, value);
      if (field === 'country') {
        setCountry(typed);
        const match = countryByName(typed);
        const next = match?.code ?? '';
        written.current = next;
        changeProfile('locationCountry', next);
      } else if (field === 'rateAmountMinor' || field === 'ratePeriod') {
        const next =
          field === 'rateAmountMinor'
            ? { amount: typed, period: ratePeriod }
            : { amount: rateAmountMinor, period: typed as RatePeriod | '' };
        setRate(next);
        // The step's one price is the first entry; the rest, added on the
        // profile page, are carried through untouched. Half a price is not one,
        // so until both halves are there the list holds nothing and what was
        // typed lives in the boxes alone.
        const others = rates.slice(1);
        const whole =
          next.amount === '' || next.period === ''
            ? others
            : [{ period: next.period, amount: next.amount }, ...others];
        fromServer.current = whole[0];
        onRates(whole);
      } else {
        changeProfile(PROFILE_FIELD[field], typed);
      }
      setErrors((current) => {
        if (current[field] === undefined) return current;
        const { [field]: _cleared, ...rest } = current;
        return rest;
      });
    },
    [changeProfile, rates, onRates, rateAmountMinor, ratePeriod],
  );

  /** A country typed in any case settles to its listed name once left. */
  const settle = useCallback(
    (field: LocationField) => {
      if (field !== 'country') return;
      const match = countryByName(country);
      if (match !== undefined && match.name !== country) setCountry(match.name);
    },
    [country],
  );

  const checkAll = useCallback((): LocationErrors => {
    const found = validateLocation(values);
    setErrors(found);
    return found;
  }, [values]);

  const complete =
    LOCATION_FIELDS.every((field) => values[field].trim() !== '') &&
    Object.keys(validateLocation(values)).length === 0;

  return { values, errors, change, settle, checkAll, complete };
}
