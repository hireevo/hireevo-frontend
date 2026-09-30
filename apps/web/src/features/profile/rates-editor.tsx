'use client';

import { useState } from 'react';
import { LuInfo } from 'react-icons/lu';
import { Checkbox, cn } from '@hireevo/ui-web';
import {
  RATE_CURRENCY,
  RATE_PERIODS,
  type RatePeriod,
  type RateValue,
} from '@/features/profile-setup/api.ts';
import {
  RATE_PERIOD_SHORT,
  asRateInput,
  toMinorUnits,
  formatRate,
} from '@/features/profile-setup/location-options.ts';

/** The currency's sign, for the box the amount is typed into. */
function symbolOf(currency: string): string {
  try {
    const parts = new Intl.NumberFormat('en', { style: 'currency', currency }).formatToParts(0);
    return parts.find((part) => part.type === 'currency')?.value ?? currency;
  } catch {
    return currency;
  }
}

/** The period as the card's own heading: "hourly" is "Hourly". */
const PERIOD_TITLE: Record<RatePeriod, string> = {
  hourly: 'Hourly',
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
};

/** What each period is good for, under its amount, as the design writes it. */
const PERIOD_BLURB: Record<RatePeriod, string> = {
  hourly: 'Best for short briefs & revisions',
  daily: 'Good for a day of focused work',
  weekly: 'Good for sprint-based work',
  monthly: 'Ideal for ongoing retainers',
  yearly: 'For a year-long engagement',
};

/**
 * What the work costs — one card per period, priced for the ones quoted.
 *
 * A card per period rather than an add-a-rate list. There are exactly five
 * periods and the API stores at most one price for each, so a list with an
 * "Add" button would only offer the person a way to pick a period twice and
 * then be refused for it.
 *
 * The tick is how a period is offered at all. Underneath it is still the same
 * fact the API stores — a period with no amount is a period not quoted — so
 * clearing the tick clears the price. What was typed is kept here while the
 * editor is open, because unticking to compare two prices and then ticking
 * again should not cost somebody the number they had typed.
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
  // What each period held before it was unticked, so ticking it again brings
  // the number back rather than an empty box.
  const [remembered, setRemembered] = useState<Partial<Record<RatePeriod, string>>>({});

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

  const toggle = (period: RatePeriod, on: boolean) => {
    if (on) {
      set(period, remembered[period] ?? '');
      return;
    }
    setRemembered((held) => ({ ...held, [period]: amountOf(period) }));
    set(period, '');
  };

  const enabled = RATE_PERIODS.filter((period) => amountOf(period).trim() !== '');

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-content-muted">
        Your price is visible only in the sections you mark public — contact details stay private.
      </p>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-medium tracking-wide text-content-subtle uppercase">
          Choose the rates you offer
        </p>

        {/* Said, not offered. Every rate is quoted in one currency, so there
            is nothing here to choose between — this is the label on the boxes
            below, which is why it is the only thing drawn. It used to be three
            buttons with two of them permanently disabled, which is a control
            that cannot do anything (§6.7). */}
        <p className="flex items-center gap-2 text-sm text-content-muted">
          Currency
          <span className="rounded-md bg-surface-accent-subtle px-3 py-1.5 text-sm font-medium text-content-accent">
            {RATE_CURRENCY}
          </span>
        </p>
      </div>

      {/* One column on a phone, two from `sm`, three where there is room: five
          narrow cards in a row leaves none of them wide enough to read.
          `min-w-0` on the cards because a grid track is sized by its content's
          minimum width unless it is told otherwise, and WebKit held these at
          the width of a card rather than of the phone. */}
      <div className="grid gap-4 *:min-w-0 sm:grid-cols-2 lg:grid-cols-3">
        {RATE_PERIODS.map((period) => (
          <RateCard
            key={period}
            period={period}
            sign={sign}
            amount={amountOf(period)}
            onAmount={(amount) => set(period, amount)}
            onToggle={(on) => toggle(period, on)}
          />
        ))}
      </div>

      <p className="flex items-start gap-2 rounded-lg border border-border-subtle bg-surface-subtle p-3 text-sm text-content-subtle">
        <LuInfo aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        Buyers only see the rates you enable — you can adjust or hide them anytime.
      </p>

      {enabled.length === 0 ? null : (
        <div className="rounded-lg border border-border-subtle p-4">
          <p className="text-xs font-medium tracking-wide text-content-subtle uppercase">
            How buyers see this
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {enabled.map((period) => {
              const minor = toMinorUnits(amountOf(period), RATE_CURRENCY);
              const shown = minor === null ? null : formatRate(minor, RATE_CURRENCY);
              return (
                <li
                  key={period}
                  className="rounded-md bg-surface-muted px-3 py-1.5 text-sm text-content"
                >
                  {shown ?? `${sign}${amountOf(period)}`}{' '}
                  <span className="text-content-subtle">{RATE_PERIOD_SHORT[period]}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <p className="text-sm text-content-subtle">
        {enabled.length} {enabled.length === 1 ? 'rate' : 'rates'} enabled
      </p>

      {error === undefined ? null : (
        <p role="alert" className="text-sm text-content-danger">
          {error}
        </p>
      )}
    </div>
  );
}

function RateCard({
  period,
  sign,
  amount,
  onAmount,
  onToggle,
}: {
  period: RatePeriod;
  sign: string;
  amount: string;
  onAmount: (amount: string) => void;
  onToggle: (on: boolean) => void;
}) {
  const on = amount.trim() !== '';
  const title = PERIOD_TITLE[period];

  return (
    <div
      className={cn(
        'flex min-w-0 flex-col rounded-lg border p-4 transition-colors',
        on ? 'border-border-accent bg-surface' : 'border-border-subtle bg-surface-subtle',
      )}
    >
      {/* Reversed, so the period reads first and its tick sits at the far edge,
          which is where the design puts it. The tick is the label: ticking the
          row is what offers the period at all. */}
      <Checkbox
        checked={on}
        onChange={(event) => onToggle(event.target.checked)}
        className="w-full flex-row-reverse justify-between"
      >
        <span className="text-sm font-semibold text-content-accent">{title}</span>
      </Checkbox>

      <div
        className={cn(
          'mt-3 flex items-center gap-2 rounded-md border bg-surface px-3 transition-colors focus-within:border-border-accent',
          on ? 'border-border' : 'border-border-subtle',
        )}
      >
        <span aria-hidden="true" className="shrink-0 text-sm text-content-subtle">
          {sign}
        </span>
        <input
          name={`rate-${period}`}
          inputMode="decimal"
          autoComplete="off"
          placeholder="0"
          value={amount}
          aria-label={`${title} rate`}
          onChange={(event) => onAmount(asRateInput(event.target.value, RATE_CURRENCY))}
          className="h-10 min-w-0 flex-1 bg-transparent text-sm text-content tabular-nums outline-none placeholder:text-content-subtle"
        />
        <span aria-hidden="true" className="shrink-0 text-sm text-content-subtle">
          {RATE_PERIOD_SHORT[period]}
        </span>
      </div>

      <p className="mt-2 text-xs text-content-subtle">{PERIOD_BLURB[period]}</p>
    </div>
  );
}
