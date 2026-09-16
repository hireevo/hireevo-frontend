'use client';

import { useId, useRef } from 'react';
import type { ChangeEvent } from 'react';
import { LuChevronDown } from 'react-icons/lu';
import { Card, cn } from '@hireevo/ui-web';
import { border } from './entry-fields.ts';
import { LOCATION_LIMITS } from './limits.ts';
import {
  REMOTE_MODES,
  countryNameOptions,
  currencyOptions,
  formatRate,
  timezoneOptions,
} from './location-options.ts';
import { CONTROL, SetupField } from './setup-field.tsx';
import { StaticDatalist } from './static-datalist.tsx';
import { StepFooter } from './step-footer.tsx';
import { StepHeader } from './step-header.tsx';
import { sectionIdFor } from './steps.ts';
import {
  LOCATION_FIELDS,
  type LocationErrors,
  type LocationField,
  type LocationValues,
} from './use-location-draft.ts';

export function LocationStep({
  values,
  errors,
  onChange,
  onBlurField,
  onSaveAndNext,
}: {
  values: LocationValues;
  errors: LocationErrors;
  onChange: (field: LocationField, value: string) => void;
  onBlurField: (field: LocationField) => void;
  /** Answers whether the step was accepted and the screen moved on. */
  onSaveAndNext: () => boolean;
}) {
  const headingId = useId();
  const countriesId = useId();
  const timezonesId = useId();
  const currenciesId = useId();
  const fields = useRef<HTMLDivElement>(null);

  const filled = LOCATION_FIELDS.filter((field) => values[field].trim() !== '').length;
  const rate = formatRate(values.rateAmountMinor, values.rateCurrency);

  const bind = (field: LocationField) => ({
    name: field,
    value: values[field],
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      onChange(field, event.target.value),
    onBlur: () => onBlurField(field),
  });

  function saveAndNext() {
    if (onSaveAndNext()) return;
    // Once the errors have rendered, take the person to the first of them.
    setTimeout(() => {
      fields.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    }, 0);
  }

  return (
    <Card
      id={sectionIdFor('location')}
      aria-labelledby={headingId}
      className="scroll-mt-6 rounded-xl p-5 sm:p-6"
    >
      <StepHeader
        id={headingId}
        number={2}
        title="Location and rate"
        description="Location and rate are optional. Currency is stored as entered; launch currencies remain a product decision."
      />

      <div
        ref={fields}
        className="mt-5 grid gap-x-4 gap-y-5 border-t border-border-subtle pt-5 sm:grid-cols-2"
      >
        <SetupField label="Country" error={errors.country}>
          {(control) => (
            <input
              {...control}
              {...bind('country')}
              list={countriesId}
              autoComplete="country-name"
              className={cn(CONTROL, 'h-10', border(errors.country))}
            />
          )}
        </SetupField>

        <SetupField
          label="City"
          error={errors.city}
          length={values.city.length}
          max={LOCATION_LIMITS.city}
        >
          {(control) => (
            <input
              {...control}
              {...bind('city')}
              maxLength={LOCATION_LIMITS.city}
              autoComplete="address-level2"
              className={cn(CONTROL, 'h-10', border(errors.city))}
            />
          )}
        </SetupField>

        <SetupField
          label="Service area"
          error={errors.serviceArea}
          length={values.serviceArea.length}
          max={LOCATION_LIMITS.serviceArea}
        >
          {(control) => (
            <input
              {...control}
              {...bind('serviceArea')}
              maxLength={LOCATION_LIMITS.serviceArea}
              placeholder="e.g. Remote across Europe and on-site in Vienna"
              className={cn(CONTROL, 'h-10', border(errors.serviceArea))}
            />
          )}
        </SetupField>

        <SetupField label="Timezone" error={errors.timezone}>
          {(control) => (
            <input
              {...control}
              {...bind('timezone')}
              list={timezonesId}
              autoComplete="off"
              spellCheck={false}
              placeholder="e.g. Europe/Vienna"
              className={cn(CONTROL, 'h-10', border(errors.timezone))}
            />
          )}
        </SetupField>

        <SetupField label="Remote availability" error={errors.remoteMode}>
          {(control) => (
            <div className="relative">
              <select
                {...control}
                {...bind('remoteMode')}
                className={cn(
                  CONTROL,
                  'h-10 appearance-none pr-9',
                  values.remoteMode === '' && 'text-content-subtle',
                  border(errors.remoteMode),
                )}
              >
                <option value="">Choose one</option>
                {REMOTE_MODES.map((mode) => (
                  <option key={mode.value} value={mode.value}>
                    {mode.label}
                  </option>
                ))}
              </select>
              <LuChevronDown
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-content-subtle"
              />
            </div>
          )}
        </SetupField>

        <SetupField label="Rate currency (3 letters)" error={errors.rateCurrency}>
          {(control) => (
            <input
              {...control}
              {...bind('rateCurrency')}
              list={currenciesId}
              maxLength={3}
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              placeholder="e.g. EUR"
              className={cn(CONTROL, 'h-10', border(errors.rateCurrency))}
            />
          )}
        </SetupField>

        <SetupField
          label="Hourly rate in smallest currency unit"
          // The design has no hint here. The amount is read back once it can be,
          // because a rate in minor units is easy to enter a hundred times off.
          {...(rate === null ? {} : { hint: `${rate} per hour` })}
          error={errors.rateAmountMinor}
        >
          {(control) => (
            <input
              {...control}
              {...bind('rateAmountMinor')}
              inputMode="numeric"
              maxLength={LOCATION_LIMITS.rateAmountMinor}
              autoComplete="off"
              className={cn(CONTROL, 'h-10 tabular-nums', border(errors.rateAmountMinor))}
            />
          )}
        </SetupField>
      </div>

      <StaticDatalist id={countriesId} options={countryNameOptions()} />
      <StaticDatalist id={timezonesId} options={timezoneOptions()} />
      <StaticDatalist id={currenciesId} options={currencyOptions()} />

      <StepFooter complete={filled === LOCATION_FIELDS.length} onContinue={saveAndNext} />
    </Card>
  );
}
