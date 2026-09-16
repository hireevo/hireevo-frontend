'use client';

import { useId, useRef } from 'react';
import { Card } from '@hireevo/ui-web';
import { ExperienceList, type ExperienceField } from './experience-list.tsx';
import { StepFooter, focusFirstProblem } from './step-footer.tsx';
import { StepHeader } from './step-header.tsx';
import { sectionIdFor } from './steps.ts';
import { type Entries } from './use-entries.ts';

export function ExperienceStep({
  experience,
  onSaveAndNext,
}: {
  experience: Entries<ExperienceField>;
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
      id={sectionIdFor('experience')}
      aria-labelledby={headingId}
      className="scroll-mt-6 rounded-xl p-5 sm:p-6"
    >
      <StepHeader
        id={headingId}
        number={4}
        title="Experience"
        description="Add only the details that support your professional story."
      />

      <div ref={fields} className="mt-5 border-t border-border-subtle pt-5">
        <ExperienceList experience={experience} />
      </div>

      <StepFooter complete={!experience.incomplete} onContinue={saveAndNext} />
    </Card>
  );
}
