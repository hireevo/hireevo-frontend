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

export const REMOTE_MODES = [
  { value: 'remote', label: 'Available remotely' },
  { value: 'on_site', label: 'On-site only' },
  { value: 'hybrid', label: 'Remote and on-site' },
] as const;

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
