'use client';

import { cn } from '@hireevo/ui-web';
import type { FieldErrors, ProfileField, ProfileValues } from '@/features/profile-setup/api.ts';
import { REMOTE_MODES } from '@/features/profile-setup/location-options.ts';
import { CONTROL, SetupField } from '@/features/profile-setup/setup-field.tsx';

/**
 * How quickly this person undertakes to reply.
 *
 * Their own commitment, in their own words, and labelled as one: nothing on
 * this platform counts messages yet, so a line reading "responds in 2 hours"
 * beside a measured-looking figure would be a claim nothing backs.
 */
export const RESPONSE_TIMES = [
  { value: 'within_hours', label: 'Within a few hours' },
  { value: 'within_a_day', label: 'Within a day' },
  { value: 'within_two_days', label: 'Within two days' },
  { value: 'within_a_week', label: 'Within a week' },
] as const;

/** The size of engagement someone is looking for, shortest first. */
export const PROJECT_LENGTHS = [
  { value: 'under_a_month', label: 'Under a month' },
  { value: 'one_to_three_months', label: '1–3 months' },
  { value: 'three_to_six_months', label: '3–6 months' },
  { value: 'over_six_months', label: 'Over six months' },
  { value: 'ongoing', label: 'Ongoing' },
] as const;

/** The three enums by value, for the places that show what was chosen. */
export const labelOfResponseTime = (value: string): string =>
  RESPONSE_TIMES.find((option) => option.value === value)?.label ?? value;
export const labelOfProjectLength = (value: string): string =>
  PROJECT_LENGTHS.find((option) => option.value === value)?.label ?? value;
export const labelOfRemoteMode = (value: string): string =>
  REMOTE_MODES.find((option) => option.value === value)?.label ?? value;

/**
 * What working together would look like: how fast a reply comes, how long an
 * engagement is wanted, where the work can happen, and from when.
 *
 * Four answers a buyer scans before deciding whether to write, which is why
 * they sit together rather than one to a section.
 */
export function WorkingPreferencesEditor({
  values,
  fieldErrors,
  onChange,
}: {
  values: ProfileValues;
  fieldErrors: FieldErrors;
  onChange: (field: ProfileField, value: string) => void;
}) {
  const select = (
    field: ProfileField,
    label: string,
    empty: string,
    options: readonly { value: string; label: string }[],
  ) => (
    <SetupField label={label} error={fieldErrors[field]}>
      {(control) => (
        <select
          {...control}
          name={field}
          value={values[field]}
          onChange={(event) => onChange(field, event.target.value)}
          className={cn(CONTROL, 'h-10')}
        >
          {/* Empty first, so a profile that has not answered does not read as
              one that chose whatever happens to be listed first. */}
          <option value="">{empty}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
    </SetupField>
  );

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {select('responseTime', 'Usually responds', 'Choose a reply time', RESPONSE_TIMES)}
      {select('projectLength', 'Project length', 'Choose a project length', PROJECT_LENGTHS)}
      {select('remoteMode', 'Where you work', 'Choose where you work', REMOTE_MODES)}

      <SetupField
        label="Available from"
        hint="Leave empty if you are available now"
        error={fieldErrors.availableFrom}
      >
        {(control) => (
          <input
            {...control}
            type="date"
            name="availableFrom"
            value={values.availableFrom}
            onChange={(event) => onChange('availableFrom', event.target.value)}
            className={cn(CONTROL, 'h-10')}
          />
        )}
      </SetupField>
    </div>
  );
}
