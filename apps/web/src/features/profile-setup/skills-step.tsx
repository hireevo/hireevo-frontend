'use client';

import { useId, useRef } from 'react';
import { Card } from '@hireevo/ui-web';
import { LanguagesList, SkillsList, type LanguageField, type SkillField } from './skill-lists.tsx';
import { StepFooter, focusFirstProblem } from './step-footer.tsx';
import { StepHeader } from './step-header.tsx';
import { sectionIdFor } from './steps.ts';
import { type Entries } from './use-entries.ts';

export function SkillsStep({
  languages,
  skills,
  onSaveAndNext,
}: {
  languages: Entries<LanguageField>;
  skills: Entries<SkillField>;
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
      id={sectionIdFor('skills')}
      aria-labelledby={headingId}
      className="scroll-mt-6 rounded-xl p-5 sm:p-6"
    >
      <StepHeader
        id={headingId}
        number={3}
        title="Languages and skills"
        description="Choose approved taxonomy skills where possible. Existing self-declared labels remain intact."
      />

      <div ref={fields} className="mt-5 border-t border-border-subtle pt-5">
        <LanguagesList languages={languages} />
        <div className="mt-6">
          <SkillsList skills={skills} />
        </div>
      </div>

      <StepFooter complete={!languages.incomplete && !skills.incomplete} onContinue={saveAndNext} />
    </Card>
  );
}
