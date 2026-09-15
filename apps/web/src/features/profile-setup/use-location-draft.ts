'use client';

import { useCallback, useState } from 'react';
import { countryByName, isCurrency, isTimezone } from './location-options.ts';

export const LOCATION_FIELDS = [
  'country',
  'city',
  'serviceArea',
  'timezone',
  'remoteMode',
  'rateCurrency',
  'rateAmountMinor',
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
  rateCurrency: '',
  rateAmountMinor: '',
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
  if (values.rateCurrency !== '' && !isCurrency(values.rateCurrency)) {
    errors.rateCurrency = 'Use a three-letter currency code, for example EUR.';
  } else if (values.rateAmountMinor !== '' && values.rateCurrency === '') {
    errors.rateCurrency = 'Add the currency this rate is in.';
  }
  return errors;
}

/** Keeps the two constrained fields in shape as they are typed. */
function normalise(field: LocationField, value: string): string {
  if (field === 'rateCurrency')
    return value
      .replace(/[^a-z]/gi, '')
      .toUpperCase()
      .slice(0, 3);
  if (field === 'rateAmountMinor') return value.replace(/\D/g, '').slice(0, 15);
  return value;
}

/**
 * The Location and rate step's values, held in the page.
 *
 * Not saved anywhere yet: the profile API has no service area, timezone or
 * remote availability, and the owner's plan is to finish every screen before
 * changing the API and integrating. Country, city, currency and rate do exist
 * in the API and are connected in that integration pass, together with the
 * rest, rather than half now. Until then the screen says so, and leaving the
 * page with anything entered asks first (in ProfileSetupScreen).
 *
 * Fields are checked when the step is submitted; an error clears as soon as
 * its field is edited.
 */
export function useLocationDraft() {
  const [values, setValues] = useState<LocationValues>(EMPTY_LOCATION);
  const [errors, setErrors] = useState<LocationErrors>({});

  const change = useCallback((field: LocationField, value: string) => {
    setValues((current) => ({ ...current, [field]: normalise(field, value) }));
    setErrors((current) => {
      if (current[field] === undefined) return current;
      const { [field]: _cleared, ...rest } = current;
      return rest;
    });
  }, []);

  // A country typed in any case settles to its listed name once left. Nothing
  // is validated on leaving a field: an error appearing then pushes the page
  // down under the pointer, so the click that left the field — on Save and
  // next, or Publish — lands beside its button and is lost.
  const settle = useCallback(
    (field: LocationField) => {
      if (field !== 'country') return;
      const match = countryByName(values.country);
      if (match !== undefined && match.name !== values.country) {
        setValues((current) => ({ ...current, country: match.name }));
      }
    },
    [values.country],
  );

  const checkAll = useCallback((): LocationErrors => {
    const found = validateLocation(values);
    setErrors(found);
    return found;
  }, [values]);

  const dirty = LOCATION_FIELDS.some((field) => values[field] !== '');
  const complete =
    LOCATION_FIELDS.every((field) => values[field].trim() !== '') &&
    Object.keys(validateLocation(values)).length === 0;

  return { values, errors, change, settle, checkAll, dirty, complete };
}
