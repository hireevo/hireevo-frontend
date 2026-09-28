'use client';

import { cn } from '@hireevo/ui-web';
import type { FieldErrors, ProfileField, ProfileValues } from '@/features/profile-setup/api.ts';
import {
  PROJECT_LENGTHS,
  RESPONSE_TIMES,
  labelOfProjectLength,
  labelOfRemoteMode,
  labelOfResponseTime,
} from '@/features/profile-setup/preference-options.ts';
import { REMOTE_MODES } from '@/features/profile-setup/location-options.ts';

// Re-exported because this editor is where they were first written and several
// screens import them from here; they now live beside the other option lists so
// the pages that only read a profile do not pull an editor in with them.
export {
  PROJECT_LENGTHS,
  RESPONSE_TIMES,
  labelOfProjectLength,
  labelOfRemoteMode,
  labelOfResponseTime,
};
import { CONTROL, SetupField } from '@/features/profile-setup/setup-field.tsx';

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
