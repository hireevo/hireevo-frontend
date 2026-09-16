'use client';

import { useId } from 'react';
import { Card, cn } from '@hireevo/ui-web';
import {
  IDENTITY_FIELDS,
  type FieldErrors,
  type IdentityField,
  type IdentityValues,
} from './api.ts';
import { border } from './entry-fields.ts';
import { IDENTITY_LIMITS } from './limits.ts';
import { AutoGrowTextarea } from './auto-grow-textarea.tsx';
import { CONTROL, SetupField } from './setup-field.tsx';
import { StepFooter } from './step-footer.tsx';
import { StepHeader } from './step-header.tsx';
import { sectionIdFor } from './steps.ts';

export function IdentityStep({
  values,
  fieldErrors,
  onChange,
  onSaveAndNext,
  saving,
  saveLabel = 'Save and next',
  requireComplete = true,
}: {
  values: IdentityValues;
  fieldErrors: FieldErrors;
  onChange: (field: IdentityField, value: string) => void;
  onSaveAndNext: () => void;
  saving: boolean;
  /** The step's own wording by default; "Save and close" where this is one card. */
  saveLabel?: string;
  /** Off where the other fields live in cards of their own (the client profile). */
  requireComplete?: boolean;
}) {
  const headingId = useId();
  const filled = IDENTITY_FIELDS.filter((field) => values[field].trim() !== '').length;

  return (
    <Card
      id={sectionIdFor('identity')}
      aria-labelledby={headingId}
      className="scroll-mt-6 rounded-xl p-5 sm:p-6"
    >
      <StepHeader
        id={headingId}
        number={1}
        title="Identity and story"
        description="Use the public name you want people to see. Identity verification is a separate protected process."
      />

      <div className="mt-5 grid gap-x-4 gap-y-5 border-t border-border-subtle pt-5 sm:grid-cols-2">
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

      <StepFooter
        complete={filled === IDENTITY_FIELDS.length}
        onContinue={onSaveAndNext}
        loading={saving}
        label={saveLabel}
        lockWhenIncomplete={requireComplete}
      />
    </Card>
  );
}
