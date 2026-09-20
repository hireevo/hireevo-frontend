'use client';

import { useRef } from 'react';
import { cn } from '@hireevo/ui-web';
import { AutoGrowTextarea } from './auto-grow-textarea.tsx';
import type { EXPERIENCE_FIELDS } from './entries-validation.ts';
import { DATE_INPUT, border } from './entry-fields.ts';
import { EntryPanel, ListHeader } from './entry-panel.tsx';
import { SECTION_LIMITS } from './limits.ts';
import { CONTROL, SetupField } from './setup-field.tsx';
import { errorKey, type Entries } from './use-entries.ts';

export type ExperienceField = (typeof EXPERIENCE_FIELDS)[number];

/** The roles someone has held: what they did, where, when, and in one paragraph. */
export function ExperienceList({
  experience,
  heading = true,
}: {
  experience: Entries<ExperienceField>;
  /** Off where the card around this list already says what it is. */
  heading?: boolean;
}) {
  const addRole = useRef<HTMLButtonElement>(null);

  return (
    <>
      <ListHeader
        {...(heading ? { title: 'Experience entries' } : {})}
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
                  <SetupField
                    label="End date"
                    hint="Leave empty if this is your current role"
                    error={error('endDate')}
                  >
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
    </>
  );
}
