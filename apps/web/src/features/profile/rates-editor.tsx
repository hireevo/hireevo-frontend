'use client';

import {
  RATE_CURRENCY,
  RATE_PERIODS,
  type RatePeriod,
  type RateValue,
} from '@/features/profile-setup/api.ts';
import { RATE_PERIOD_LABEL, asRateInput } from '@/features/profile-setup/location-options.ts';
import { SetupField } from '@/features/profile-setup/setup-field.tsx';

/** The currency's sign, for the box the amount is typed into. */
function symbolOf(currency: string): string {
  try {
    const parts = new Intl.NumberFormat('en', { style: 'currency', currency }).formatToParts(0);
    return parts.find((part) => part.type === 'currency')?.value ?? currency;
  } catch {
    return currency;
  }
}

/** "hourly" as the label above its box: "Per hour". */
function labelOf(period: RatePeriod): string {
  const label = RATE_PERIOD_LABEL[period] ?? period;
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/**
 * What the work costs — one box per period, filled in for the ones quoted.
 *
 * A box per period rather than an add-a-rate list. There are exactly five
 * periods and the API stores at most one price for each, so a list with an
 * "Add" button would only offer the person a way to pick a period twice and
 * then be refused for it. Leaving a box empty is how a period is not quoted,
 * and clearing the last one clears the prices.
 *
 * The amount is typed the way it is spoken — 85 is eighty-five dollars, not
 * eighty-five cents — and converted to the minor units the API stores at the
 * seam that talks to it. It used to be typed in minor units behind a "$", so
 * anyone who typed what they charge priced their week at a few cents and only
 * the hint underneath said so.
 */
export function RatesEditor({
  rates,
  error,
  onChange,
}: {
  rates: RateValue[];
  /** The one error the API can return for the list, e.g. two prices for a period. */
  error?: string | undefined;
  onChange: (rates: RateValue[]) => void;
}) {
  const sign = symbolOf(RATE_CURRENCY);
  const amountOf = (period: RatePeriod) =>
    rates.find((rate) => rate.period === period)?.amount ?? '';

  const set = (period: RatePeriod, amount: string) => {
    const kept = rates.filter((rate) => rate.period !== period);
    const next = amount.trim() === '' ? kept : [...kept, { period, amount }];
    // Back into the order the API answers in, so the list the person sees and
    // the list a buyer reads lead with the same price.
    onChange(
      next.slice().sort((a, b) => RATE_PERIODS.indexOf(a.period) - RATE_PERIODS.indexOf(b.period)),
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-content-muted">
        Fill in the periods you quote for. Leave the rest empty — buyers see only the prices you
        give.
      </p>

      {/* One column on a phone, two from `sm`, three where there is room: five
          narrow boxes in a row leaves none of them wide enough to read. */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {RATE_PERIODS.map((period) => (
          // No "Optional" tag on any of the five: the line above already says
          // they are, and five copies of the word is noise.
          <SetupField key={period} label={labelOf(period)} optional={false}>
            {(control) => (
              <div className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 transition-colors focus-within:border-border-accent">
                <span aria-hidden="true" className="shrink-0 text-sm text-content-subtle">
                  {sign}
                </span>
                <input
                  {...control}
                  name={`rate-${period}`}
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="0"
                  value={amountOf(period)}
                  onChange={(event) => set(period, asRateInput(event.target.value, RATE_CURRENCY))}
                  className="h-10 min-w-0 flex-1 bg-transparent text-sm text-content tabular-nums outline-none placeholder:text-content-subtle"
                />
              </div>
            )}
          </SetupField>
        ))}
      </div>

      {error === undefined ? null : (
        <p role="alert" className="text-sm text-content-danger">
          {error}
        </p>
      )}
    </div>
  );
}
