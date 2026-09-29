'use client';

import { cn } from '@hireevo/ui-web';
import { MarkdownEditor } from '@/features/rich-text/markdown-editor.tsx';
import type { FieldErrors, IdentityField, IdentityValues } from './api.ts';
import { AutoGrowTextarea } from './auto-grow-textarea.tsx';
import { border } from './entry-fields.ts';
import { IDENTITY_LIMITS } from './limits.ts';
import { CONTROL, SetupField } from './setup-field.tsx';

/**
 * The public name, headline, biography and availability.
 *
 * Fields on their own, with no card, heading or footer around them: profile
 * setup frames them as its first step and shows all of them. The client
 * profile's About card asks for `only` the biography — the name and headline
 * are edited on the profile header there, so repeating them under About was the
 * same field in two places.
 */
export function IdentityFields({
  values,
  fieldErrors,
  onChange,
  only,
}: {
  values: IdentityValues;
  fieldErrors: FieldErrors;
  onChange: (field: IdentityField, value: string) => void;
  /** Which fields to render; all of them when omitted. */
  only?: readonly IdentityField[];
}) {
  const shows = (field: IdentityField) => only === undefined || only.includes(field);
  return (
    <div className={cn('grid gap-x-4 gap-y-5', only === undefined && 'sm:grid-cols-2')}>
      {shows('displayName') && (
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
      )}

      {shows('headline') && (
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
      )}

      {shows('overview') && (
        <SetupField
          label="Biography"
          // Under the About card, which already says "Biography" in everything
          // but the word, the label is the same thing twice; the wizard, where
          // this sits among other fields, keeps it.
          hideLabel={only !== undefined}
          hint="Do not include email, phone, links, or social handles in public text."
          error={fieldErrors.overview}
          length={values.overview.length}
          max={IDENTITY_LIMITS.overview}
          alwaysCount
          className="sm:col-span-2"
        >
          {(control) => (
            <MarkdownEditor
              {...control}
              value={values.overview}
              maxLength={IDENTITY_LIMITS.overview}
              onChange={(next) => onChange('overview', next)}
              className={cn(
                CONTROL,
                'min-h-24 resize-none py-2 leading-relaxed',
                border(fieldErrors.overview),
              )}
            />
          )}
        </SetupField>
      )}

      {shows('availabilityNote') && (
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
      )}
    </div>
  );
}
