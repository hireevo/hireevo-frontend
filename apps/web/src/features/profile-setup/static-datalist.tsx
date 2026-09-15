import { memo } from 'react';

/**
 * Suggestions for an input, rebuilt only when its options change.
 *
 * Every section of profile setup is on one page, so a keystroke anywhere renders
 * all of them. Without this, the 418 timezones and 250 countries were rebuilt on
 * every letter typed into any field. `options` must keep its identity between
 * renders — the option lists come cached from their modules for that reason.
 */
export const StaticDatalist = memo(function StaticDatalist({
  id,
  options,
}: {
  id: string;
  options: readonly string[];
}) {
  return (
    <datalist id={id}>
      {options.map((option) => (
        <option key={option} value={option} />
      ))}
    </datalist>
  );
});
