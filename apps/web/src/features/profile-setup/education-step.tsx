'use client';

import { useId, useRef } from 'react';
import { Card } from '@hireevo/ui-web';
import {
  EducationList,
  LicenseList,
  type EducationField,
  type LicenseField,
} from './education-lists.tsx';
import { StepFooter, focusFirstProblem } from './step-footer.tsx';
import { StepHeader } from './step-header.tsx';
import { sectionIdFor } from './steps.ts';
import { type Entries } from './use-entries.ts';

export function EducationStep({
  education,
  licenses,
  onSaveAndNext,
}: {
  education: Entries<EducationField>;
  licenses: Entries<LicenseField>;
  /** Answers whether the step was accepted and the screen moved on. */
  onSaveAndNext: () => boolean;
}) {
  const headingId = useId();
  const fields = useRef<HTMLDivElement>(null);

  function saveAndNext() {
    if (!onSaveAndNext()) focusFirstProblem(fields.current);
  }

  return (
    <Card
      id={sectionIdFor('education')}
      aria-labelledby={headingId}
      className="scroll-mt-6 rounded-xl p-5 sm:p-6"
    >
      <StepHeader
        id={headingId}
        number={5}
        title="Education and licenses"
        description="Claims remain self-declared. Do not enter credential numbers or upload evidence here."
      />

      <div ref={fields} className="mt-5 border-t border-border-subtle pt-5">
        <EducationList education={education} />
        <div className="mt-6">
          <LicenseList licenses={licenses} />
        </div>
      </div>

      <StepFooter
        complete={!education.incomplete && !licenses.incomplete}
        onContinue={saveAndNext}
      />
    </Card>
  );
}
