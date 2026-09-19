'use client';

import { cn } from '@hireevo/ui-web';
import type { FieldErrors, ProfileField, ProfileValues } from '@/features/profile-setup/api.ts';
import {
  asCurrencyCode,
  asMinorAmount,
  formatRate,
} from '@/features/profile-setup/location-options.ts';
import { CONTROL, SetupField } from '@/features/profile-setup/setup-field.tsx';

/**
 * What the work costs: a currency and an hourly rate.
 *
 * The rate is held in the smallest unit the currency has — cents, paise — which
 * is what the API stores and what keeps money out of floating point. Nobody
 * thinks in minor units, so what was typed is read back underneath in the
 * currency itself, and the two are never out of step because one is derived
 * from the other.
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
  const shown = formatRate(values.rateAmountMinor, values.rateCurrency);

  return (
    <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2">
      <SetupField label="Rate currency (3 letters)" error={fieldErrors.rateCurrency}>
        {(control) => (
          <input
            {...control}
            name="rateCurrency"
            autoComplete="off"
            placeholder="EUR"
            value={values.rateCurrency}
            onChange={(event) => onChange('rateCurrency', asCurrencyCode(event.target.value))}
            className={cn(CONTROL, 'h-10 tabular-nums uppercase')}
          />
        )}
      </SetupField>

      <SetupField
        label="Hourly rate in smallest currency unit"
        error={fieldErrors.rateAmountMinor}
        {...(shown === null ? {} : { hint: `${shown} per hour` })}
      >
        {(control) => (
          <input
            {...control}
            name="rateAmountMinor"
            inputMode="numeric"
            autoComplete="off"
            placeholder="14000"
            value={values.rateAmountMinor}
            onChange={(event) => onChange('rateAmountMinor', asMinorAmount(event.target.value))}
            className={cn(CONTROL, 'h-10 tabular-nums')}
          />
        )}
      </SetupField>
    </div>
  );
}
