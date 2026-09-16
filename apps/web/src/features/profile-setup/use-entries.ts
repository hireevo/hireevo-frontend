'use client';

import { useRef, useState } from 'react';

export type Entry<F extends string> = { key: string; values: Record<F, string> };
export type EntryErrors = Readonly<Record<string, string>>;

/** The key an entry field's error is kept under. */
export const errorKey = (entryKey: string, field: string): string => `${entryKey}.${field}`;

function blank<F extends string>(fields: readonly F[]): Record<F, string> {
  return Object.fromEntries(fields.map((field) => [field, ''])) as Record<F, string>;
}

function withoutKey(errors: EntryErrors, name: string): EntryErrors {
  if (errors[name] === undefined) return errors;
  return Object.fromEntries(Object.entries(errors).filter(([key]) => key !== name));
}

/**
 * A repeatable group of fields — a language, a role, a license — held in the page.
 *
 * Not saved anywhere yet, like every section after Identity and story: the API
 * has no fields for these, and the screens are finished before it gains them.
 *
 * The list starts with one empty entry, as the design draws each list. Keys are
 * prefixed per list so that two lists on the page never share one. `lastAdded`
 * names the entry added most recently so it can take focus as it appears;
 * entries present from the start never do, so opening the page does not jump
 * into a field.
 */
export function useEntries<F extends string>(
  prefix: string,
  fields: readonly F[],
  {
    normalise,
    optional = [],
    initial,
  }: {
    normalise?: (field: F, value: string) => string;
    /**
     * Fields an entry may leave empty and still count as finished — an end date
     * on a role someone still holds, an expiry on a license that never expires.
     * Everything else has to be filled in.
     */
    optional?: readonly F[];
    /** Entries to open on — a draft read back from this browser. */
    initial?: Entry<F>[] | undefined;
  } = {},
) {
  const [items, setItems] = useState<Entry<F>[]>(() =>
    initial === undefined || initial.length === 0
      ? [{ key: `${prefix}-0`, values: blank(fields) }]
      : initial,
  );
  // Past every key already in use, so a restored draft and a new entry never
  // share one.
  const next = useRef(
    Math.max(0, ...items.map((item) => Number(item.key.split('-').pop()) + 1 || 0)) || 1,
  );
  const [errors, setErrors] = useState<EntryErrors>({});
  const [lastAdded, setLastAdded] = useState<string | null>(null);

  function add(values: Partial<Record<F, string>> = {}): string {
    const key = `${prefix}-${next.current}`;
    next.current += 1;
    setItems((current) => [...current, { key, values: { ...blank(fields), ...values } }]);
    setLastAdded(key);
    return key;
  }

  function remove(key: string) {
    setItems((current) => current.filter((item) => item.key !== key));
    setErrors((current) =>
      Object.fromEntries(Object.entries(current).filter(([name]) => !name.startsWith(`${key}.`))),
    );
  }

  function update(key: string, field: F, value: string) {
    const typed = normalise === undefined ? value : normalise(field, value);
    setItems((current) =>
      current.map((item) =>
        item.key === key ? { ...item, values: { ...item.values, [field]: typed } } : item,
      ),
    );
    setErrors((current) => withoutKey(current, errorKey(key, field)));
  }

  const filled = (item: Entry<F>) =>
    fields.every((field) => optional.includes(field) || item.values[field].trim() !== '');

  return {
    items,
    errors,
    lastAdded,
    add,
    remove,
    update,
    showErrors: (found: EntryErrors) => setErrors(found),
    /** Some entry still has an empty field. */
    incomplete: items.some((item) => !filled(item)),
    /** At least one entry, and no empty field in any of them. */
    complete: items.length > 0 && items.every(filled),
    /** Anything typed into any entry. */
    dirty: items.some((item) => fields.some((field) => item.values[field] !== '')),
  };
}

export type Entries<F extends string> = ReturnType<typeof useEntries<F>>;
