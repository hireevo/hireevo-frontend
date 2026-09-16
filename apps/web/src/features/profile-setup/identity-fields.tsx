'use client';

import { cn } from '@hireevo/ui-web';
import type { FieldErrors, IdentityField, IdentityValues } from './api.ts';
import { AutoGrowTextarea } from './auto-grow-textarea.tsx';
import { border } from './entry-fields.ts';
import { IDENTITY_LIMITS } from './limits.ts';
import { CONTROL, SetupField } from './setup-field.tsx';

/**
 * The public name, headline, biography and availability.
 *
 * Fields on their own, with no card, heading or footer around them: profile
 * setup frames them as its first step, and the client profile puts the same
 * fields inside its About card, which brings its own heading and its own save.
 */
export function IdentityFields({
  values,
  fieldErrors,
  onChange,
}: {
  values: IdentityValues;
  fieldErrors: FieldErrors;
  onChange: (field: IdentityField, value: string) => void;
}) {
  return (
    <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
      <SetupField
        label="Display name"
        error={fieldErrors.displayName}
        length={values.displayName.length}
        max={IDENTITY_LIMITS.displayName}
      >
        {(control) => (
          <input
            {...control}
            name="displayName"
            autoComplete="nickname"
            value={values.displayName}
            maxLength={IDENTITY_LIMITS.displayName}
            onChange={(event) => onChange('displayName', event.target.value)}
            className={cn(CONTROL, 'h-10', border(fieldErrors.displayName))}
          />
        )}
      </SetupField>

      <SetupField
        label="Professional headline"
        error={fieldErrors.headline}
        length={values.headline.length}
        max={IDENTITY_LIMITS.headline}
      >
        {(control) => (
          <AutoGrowTextarea
            {...control}
            name="headline"
            rows={1}
            maxHeight={160}
            value={values.headline}
            maxLength={IDENTITY_LIMITS.headline}
            onChange={(event) => onChange('headline', event.target.value)}
            className={cn(
              CONTROL,
              'min-h-10 resize-none py-2 leading-snug',
              border(fieldErrors.headline),
            )}
          />
        )}
      </SetupField>

      <SetupField
        label="Biography"
        hint="Do not include email, phone, links, or social handles in public text."
        error={fieldErrors.overview}
        length={values.overview.length}
        max={IDENTITY_LIMITS.overview}
        className="sm:col-span-2"
      >
        {(control) => (
          <AutoGrowTextarea
            {...control}
            name="overview"
            rows={4}
            maxHeight={360}
            value={values.overview}
            maxLength={IDENTITY_LIMITS.overview}
            onChange={(event) => onChange('overview', event.target.value)}
            className={cn(
              CONTROL,
              'min-h-24 resize-none py-2 leading-relaxed',
              border(fieldErrors.overview),
            )}
          />
        )}
      </SetupField>

      <SetupField
        label="Availability"
        error={fieldErrors.availabilityNote}
        length={values.availabilityNote.length}
        max={IDENTITY_LIMITS.availabilityNote}
        className="sm:col-span-2"
      >
        {(control) => (
          <input
            {...control}
            name="availabilityNote"
            value={values.availabilityNote}
            maxLength={IDENTITY_LIMITS.availabilityNote}
            placeholder="e.g. Open to one discovery engagement starting October 2026"
            onChange={(event) => onChange('availabilityNote', event.target.value)}
            className={cn(CONTROL, 'h-10', border(fieldErrors.availabilityNote))}
          />
        )}
      </SetupField>
    </div>
  );
}
