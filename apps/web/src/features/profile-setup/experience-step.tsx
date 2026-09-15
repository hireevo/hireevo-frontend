'use client';

import { useId, useRef } from 'react';
import { Card, cn } from '@hireevo/ui-web';
import { AutoGrowTextarea } from './auto-grow-textarea.tsx';
import type { EXPERIENCE_FIELDS } from './entries-validation.ts';
import { EntryPanel, ListHeader } from './entry-panel.tsx';
import { SECTION_LIMITS } from './limits.ts';
import { CONTROL, SetupField } from './setup-field.tsx';
import { StepFooter, focusFirstProblem } from './step-footer.tsx';
import { StepHeader } from './step-header.tsx';
import { sectionIdFor } from './steps.ts';
import { errorKey, type Entries } from './use-entries.ts';

type ExperienceField = (typeof EXPERIENCE_FIELDS)[number];

export const border = (error: string | undefined) =>
  error === undefined ? 'border-border' : 'border-border-danger';

/** A native date input: the browser's own calendar, keyboard entry and date format. */
export const DATE_INPUT = { type: 'date', min: '1900-01-01', max: '2100-12-31' } as const;

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
  const addRole = useRef<HTMLButtonElement>(null);

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
        <ListHeader
          title="Experience entries"
          addLabel="Add experience entry"
          addRef={addRole}
          onAdd={() => experience.add()}
        />
        <div className="mt-3 flex flex-col gap-3">
          {experience.items.map((item, index) => {
            const error = (field: ExperienceField) => experience.errors[errorKey(item.key, field)];
            const bind = (field: ExperienceField) => ({
              name: field,
              value: item.values[field],
              onChange: (event: { target: { value: string } }) =>
                experience.update(item.key, field, event.target.value),
            });
            return (
              <EntryPanel
                key={item.key}
                entryKey={item.key}
                label={`Role ${index + 1}`}
                removeLabel={`Remove role ${index + 1}`}
                onRemove={() => {
                  experience.remove(item.key);
                  addRole.current?.focus();
                }}
                focusOnMount={item.key === experience.lastAdded}
              >
                {() => (
                  <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2">
                    <SetupField label="Role" error={error('role')}>
                      {(control) => (
                        <input
                          {...control}
                          {...bind('role')}
                          autoComplete="organization-title"
                          maxLength={SECTION_LIMITS.role}
                          className={cn(CONTROL, 'h-10', border(error('role')))}
                        />
                      )}
                    </SetupField>
                    <SetupField label="Organization" error={error('organization')}>
                      {(control) => (
                        <input
                          {...control}
                          {...bind('organization')}
                          autoComplete="organization"
                          maxLength={SECTION_LIMITS.organization}
                          className={cn(CONTROL, 'h-10', border(error('organization')))}
                        />
                      )}
                    </SetupField>
                    <SetupField label="Start date" error={error('startDate')}>
                      {(control) => (
                        <input
                          {...control}
                          {...bind('startDate')}
                          {...DATE_INPUT}
                          className={cn(CONTROL, 'h-10', border(error('startDate')))}
                        />
                      )}
                    </SetupField>
                    {/* The design marks every field here Optional except this one. */}
                    <SetupField label="End date" optional={false} error={error('endDate')}>
                      {(control) => (
                        <input
                          {...control}
                          {...bind('endDate')}
                          {...DATE_INPUT}
                          className={cn(CONTROL, 'h-10', border(error('endDate')))}
                        />
                      )}
                    </SetupField>
                    <SetupField
                      label="Summary"
                      error={error('summary')}
                      length={item.values.summary.length}
                      max={SECTION_LIMITS.summary}
                      className="sm:col-span-2"
                    >
                      {(control) => (
                        <AutoGrowTextarea
                          {...control}
                          {...bind('summary')}
                          rows={3}
                          maxHeight={240}
                          maxLength={SECTION_LIMITS.summary}
                          className={cn(
                            CONTROL,
                            'min-h-20 resize-none py-2 leading-relaxed',
                            border(error('summary')),
                          )}
                        />
                      )}
                    </SetupField>
                  </div>
                )}
              </EntryPanel>
            );
          })}
        </div>
      </div>

      <StepFooter complete={!experience.incomplete} onContinue={saveAndNext} />
    </Card>
  );
}
