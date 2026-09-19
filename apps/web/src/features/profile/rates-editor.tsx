'use client';

import { cn } from '@hireevo/ui-web';
import type { FieldErrors, ProfileField, ProfileValues } from '@/features/profile-setup/api.ts';
import {
  asCurrencyCode,
  asMinorAmount,
  formatRate,
} from '@/features/profile-setup/location-options.ts';
import { CONTROL, SetupField } from '@/features/profile-setup/setup-field.tsx';

/** The three periods the design prices, in its order. */
const PERIODS = [
  { field: 'rateAmountMinor', label: 'Hourly Rate', per: 'per hour' },
  { field: 'rateWeeklyAmountMinor', label: 'Weekly Rate', per: 'per week' },
  { field: 'rateMonthlyAmountMinor', label: 'Monthly Rate', per: 'per month' },
] as const satisfies readonly { field: ProfileField; label: string; per: string }[];

/**
 * What the currency is written as: "$" for USD, "₨" for PKR, the code itself
 * for anything the runtime has no symbol for.
 *
 * The design draws a "$" against every field. Taking that literally would price
 * everyone in dollars, so the sign follows the currency actually chosen and
 * falls back to the design's while there is none.
 */
function symbolOf(currency: string): string {
  if (!/^[A-Z]{3}$/.test(currency)) return '$';
  try {
    const parts = new Intl.NumberFormat('en', { style: 'currency', currency }).formatToParts(0);
    return parts.find((part) => part.type === 'currency')?.value ?? currency;
  } catch {
    return currency;
  }
}

/**
 * What the work costs, by the hour, the week and the month.
 *
 * Amounts are held in the smallest unit the currency has — cents, paise — which
 * is what the API stores and what keeps money out of floating point. Nobody
 * thinks in minor units, so each field reads back underneath in the currency
 * itself, derived from what was typed rather than stored separately.
 *
 * All three share one currency: the same work priced three ways is one price.
 * A period left empty is left unpriced, which is not the same as free.
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
  const sign = symbolOf(values.rateCurrency);

  return (
    <div>
      <div className="sm:max-w-[200px]">
        <SetupField label="Currency (3 letters)" error={fieldErrors.rateCurrency}>
          {(control) => (
            <input
              {...control}
              name="rateCurrency"
              autoComplete="off"
              placeholder="USD"
              value={values.rateCurrency}
              onChange={(event) => onChange('rateCurrency', asCurrencyCode(event.target.value))}
              className={cn(CONTROL, 'h-10 tabular-nums uppercase')}
            />
          )}
        </SetupField>
      </div>

      {/* The design's row of three, with its "Price" label at the left. Below
          `sm` they stack: four columns at a phone width leaves each of them
          too narrow to type a number into. */}
      <div className="mt-5 grid gap-x-4 gap-y-4 sm:grid-cols-[auto_repeat(3,minmax(0,1fr))]">
        <p
          aria-hidden="true"
          className="hidden self-end pb-2.5 text-sm font-bold text-content-accent sm:block"
        >
          Price
        </p>

        {PERIODS.map(({ field, label, per }) => {
          const shown = formatRate(values[field], values.rateCurrency);
          return (
            <SetupField
              key={field}
              label={label}
              error={fieldErrors[field]}
              {...(shown === null ? {} : { hint: `${shown} ${per}` })}
            >
              {(control) => (
                <div className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 transition-colors focus-within:border-border-accent">
                  <span aria-hidden="true" className="shrink-0 text-sm text-content-subtle">
                    {sign}
                  </span>
                  <input
                    {...control}
                    name={field}
                    inputMode="numeric"
                    autoComplete="off"
                    value={values[field]}
                    onChange={(event) => onChange(field, asMinorAmount(event.target.value))}
                    className="h-10 min-w-0 flex-1 bg-transparent text-sm text-content tabular-nums outline-none placeholder:text-content-subtle"
                  />
                </div>
              )}
            </SetupField>
          );
        })}
      </div>
    </div>
  );
}
