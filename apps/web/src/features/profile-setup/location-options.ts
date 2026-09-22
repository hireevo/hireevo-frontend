/**
 * The choices behind the Location and rate fields.
 *
 * Countries are the ISO 3166-1 alpha-2 codes — what the API stores — named in
 * English by the browser, so there is no translation table here to fall behind.
 * Timezones and currencies come from the browser too.
 */
const ISO_COUNTRIES = (
  'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ ' +
  'BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM ' +
  'DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS ' +
  'GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN ' +
  'KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ ' +
  'MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM ' +
  'PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV ' +
  'SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI ' +
  'VN VU WF WS YE YT ZA ZM ZW'
).split(' ');

export type CountryOption = { code: string; name: string };

let countries: CountryOption[] | null = null;

export function countryOptions(): CountryOption[] {
  if (countries !== null) return countries;
  const names = new Intl.DisplayNames(['en'], { type: 'region' });
  countries = ISO_COUNTRIES.map((code) => ({ code, name: names.of(code) ?? code })).sort((a, b) =>
    a.name.localeCompare(b.name, 'en'),
  );
  return countries;
}

/** The country a typed name refers to, ignoring case and surrounding spaces. */
let countryNames: readonly string[] | null = null;

/** The countries' names alone, for suggestions. */
export function countryNameOptions(): readonly string[] {
  countryNames ??= countryOptions().map((country) => country.name);
  return countryNames;
}

export function countryByName(name: string): CountryOption | undefined {
  const wanted = name.trim().toLowerCase();
  if (wanted === '') return undefined;
  return countryOptions().find((country) => country.name.toLowerCase() === wanted);
}

/** The country a stored code refers to — what the API holds, named for the field. */
export function countryByCode(code: string | null | undefined): CountryOption | undefined {
  const wanted = (code ?? '').trim().toUpperCase();
  if (wanted === '') return undefined;
  return countryOptions().find((country) => country.code === wanted);
}

let timezones: readonly string[] | null = null;

export function timezoneOptions(): readonly string[] {
  timezones ??=
    typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : ['UTC'];
  return timezones;
}

/** `UTC` is accepted by name even where the browser lists it only under an alias. */
export function isTimezone(value: string): boolean {
  return value === 'UTC' || timezoneOptions().includes(value);
}

let currencies: readonly string[] | null = null;

export function currencyOptions(): readonly string[] {
  currencies ??=
    typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('currency') : [];
  return currencies;
}

export function isCurrency(value: string): boolean {
  return /^[A-Z]{3}$/.test(value) && currencyOptions().includes(value);
}

/**
 * The shape a rate is typed in, wherever it is typed.
 *
 * A currency is three letters and nothing else. An amount is typed the way it
 * is spoken — 85 means eighty-five dollars, not eighty-five cents — and is
 * converted to the minor units the API stores at the seam that talks to it.
 * Fifteen digits stay below 2^53, so the figure is never rounded on the way.
 */
export function asCurrencyCode(value: string): string {
  return value
    .replace(/[^a-z]/gi, '')
    .toUpperCase()
    .slice(0, 3);
}

/**
 * How many minor units make a major one: 100 for USD, 1 for JPY, 1000 for KWD.
 *
 * Read from the currency rather than assumed, because "divide by a hundred" is
 * wrong for a fifth of the world's currencies and wrong by a factor of a
 * hundred when it is.
 */
export function minorDigitsOf(currency: string): number {
  if (!isCurrency(currency)) return 2;
  return (
    new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions()
      .maximumFractionDigits ?? 2
  );
}

/**
 * What the person typed, kept as they typed it.
 *
 * Digits and at most one separator, trimmed to the places the currency has —
 * typing a third decimal in USD is a typo, not an amount. The value is not
 * normalised while it is being typed: "85." is a half-written "85.50", and
 * correcting it under the caret is how a field fights the person using it.
 */
export function asRateInput(value: string, currency: string): string {
  const digits = minorDigitsOf(currency);
  const cleaned = value.replace(/[^\d.]/g, '').replace(/(?<=\..*)\./g, '');
  const [whole = '', fraction] = cleaned.split('.');
  const major = whole.slice(0, 15 - digits);
  if (fraction === undefined) return major;
  return digits === 0 ? major : `${major}.${fraction.slice(0, digits)}`;
}

/** What the person typed, as the whole number of minor units the API stores. */
export function toMinorUnits(typed: string, currency: string): string | null {
  const value = typed.trim();
  if (value === '' || !/^\d*(\.\d*)?$/.test(value)) return null;

  const digits = minorDigitsOf(currency);
  const [whole = '', fraction = ''] = value.split('.');
  const minor = `${whole || '0'}${fraction.padEnd(digits, '0').slice(0, digits)}`;
  // Leading zeros dropped, so "0085" and "85" are the same amount to the API.
  const trimmed = minor.replace(/^0+(?=\d)/, '');
  return trimmed === '0' ? null : trimmed;
}

/** The inverse, for filling the field back in from what was saved. */
export function toTypedAmount(amountMinor: string, currency: string): string {
  if (!/^\d{1,15}$/.test(amountMinor)) return '';
  const digits = minorDigitsOf(currency);
  if (digits === 0) return amountMinor;

  const padded = amountMinor.padStart(digits + 1, '0');
  const whole = padded.slice(0, -digits);
  const fraction = padded.slice(-digits).replace(/0+$/, '');
  return fraction === '' ? whole : `${whole}.${fraction}`;
}

export const REMOTE_MODES = [
  { value: 'remote', label: 'Available remotely' },
  { value: 'on_site', label: 'On-site only' },
  { value: 'hybrid', label: 'Remote and on-site' },
] as const;

/**
 * What a rate's period is called where it is read, rather than the value the
 * API stores. One copy, because the client profile and the public profile both
 * render it and two copies drift (§8.4).
 */
export const RATE_PERIOD_LABEL: Record<string, string> = {
  hourly: 'per hour',
  daily: 'per day',
  weekly: 'per week',
  monthly: 'per month',
  yearly: 'per year',
};

/**
 * The same periods where the space is a chip rather than a sentence — "$45 /hr".
 *
 * Separate from the sentence form rather than derived from it: "per hour"
 * shortens to "/hr", not to "/hour", and a rule that produces both from one
 * string is more code than the five words it saves.
 */
export const RATE_PERIOD_SHORT: Record<string, string> = {
  hourly: '/hr',
  daily: '/day',
  weekly: '/wk',
  monthly: '/mo',
  yearly: '/yr',
};

/**
 * A rate in minor units, as the person will read it: "14000" in EUR is "€140.00".
 *
 * The number of minor units per major one comes from the currency itself — two
 * for EUR, none for JPY — so the hint cannot be off by a factor of a hundred.
 * Fifteen digits stay below 2^53, so the division is exact.
 */
export function formatRate(amountMinor: string, currency: string): string | null {
  if (!/^\d{1,15}$/.test(amountMinor) || !isCurrency(currency)) return null;
  const format = new Intl.NumberFormat('en', { style: 'currency', currency });
  const digits = format.resolvedOptions().maximumFractionDigits ?? 2;
  return format.format(Number(amountMinor) / 10 ** digits);
}
