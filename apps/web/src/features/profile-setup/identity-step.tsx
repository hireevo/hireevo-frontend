'use client';

import { useId } from 'react';
import { Card } from '@hireevo/ui-web';
import {
  IDENTITY_FIELDS,
  type FieldErrors,
  type IdentityField,
  type IdentityValues,
} from './api.ts';
import { IdentityFields } from './identity-fields.tsx';
import { StepFooter } from './step-footer.tsx';
import { StepHeader } from './step-header.tsx';
import { sectionIdFor } from './steps.ts';

export function IdentityStep({
  values,
  fieldErrors,
  onChange,
  onSaveAndNext,
  saving,
}: {
  values: IdentityValues;
  fieldErrors: FieldErrors;
  onChange: (field: IdentityField, value: string) => void;
  onSaveAndNext: () => void;
  saving: boolean;
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

      <div className="mt-5 border-t border-border-subtle pt-5">
        <IdentityFields values={values} fieldErrors={fieldErrors} onChange={onChange} />
      </div>

      <StepFooter
        complete={filled === IDENTITY_FIELDS.length}
        onContinue={onSaveAndNext}
        loading={saving}
      />
    </Card>
  );
}
