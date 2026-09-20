'use client';

import { cn } from '@hireevo/ui-web';
import {
  RATE_CURRENCY,
  type FieldErrors,
  type ProfileField,
  type ProfileValues,
} from '@/features/profile-setup/api.ts';
import { asRateInput } from '@/features/profile-setup/location-options.ts';
import { CONTROL, SetupField } from '@/features/profile-setup/setup-field.tsx';

/** What one rate can buy. */
const PERIODS = [
  { value: 'weekly', label: 'Per week' },
  { value: 'monthly', label: 'Per month' },
  { value: 'yearly', label: 'Per year' },
] as const;

/** The currency's sign, for the box the amount is typed into. */
function symbolOf(currency: string): string {
  try {
    const parts = new Intl.NumberFormat('en', { style: 'currency', currency }).formatToParts(0);
    return parts.find((part) => part.type === 'currency')?.value ?? currency;
  } catch {
    return currency;
  }
}

/**
 * What the work costs, and what that buys.
 *
 * One amount and one period, not a column of periods to fill in: somebody sells
 * their time one way and quotes it one way.
 *
 * The amount is typed the way it is spoken — 85 is eighty-five dollars, not
 * eighty-five cents — and converted to the minor units the API stores at the
 * seam that talks to it. It used to be typed in minor units behind a "$", so
 * anyone who typed what they charge priced their week at a few cents and only
 * the hint underneath said so.
 */
export function RatesEditor({
  values,
  fieldErrors,
  onChange,
}: {
  values: ProfileValues;
  fieldErrors: FieldErrors;
  onChange: (field: ProfileField, value: string) => void;
}) {
  const sign = symbolOf(RATE_CURRENCY);

  return (
    // Below `sm` they stack: two controls side by side at a phone width leaves
    // neither wide enough to read.
    <div className="grid gap-4 sm:grid-cols-2 sm:items-start">
      <SetupField label="Rate" error={fieldErrors.rateAmountMinor}>
        {(control) => (
          <div className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 transition-colors focus-within:border-border-accent">
            <span aria-hidden="true" className="shrink-0 text-sm text-content-subtle">
              {sign}
            </span>
            <input
              {...control}
              name="rateAmountMinor"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0"
              value={values.rateAmountMinor}
              onChange={(event) =>
                onChange('rateAmountMinor', asRateInput(event.target.value, RATE_CURRENCY))
              }
              className="h-10 min-w-0 flex-1 bg-transparent text-sm text-content tabular-nums outline-none placeholder:text-content-subtle"
            />
          </div>
        )}
      </SetupField>

      <SetupField label="Per" error={fieldErrors.ratePeriod}>
        {(control) => (
          <select
            {...control}
            name="ratePeriod"
            value={values.ratePeriod}
            onChange={(event) => onChange('ratePeriod', event.target.value)}
            className={cn(CONTROL, 'h-10')}
          >
            {/* Empty first, so a profile with no rate does not read as one
                priced by the week with the amount left out. */}
            <option value="">Choose a period</option>
            {PERIODS.map((period) => (
              <option key={period.value} value={period.value}>
                {period.label}
              </option>
            ))}
          </select>
        )}
      </SetupField>
    </div>
  );
}
