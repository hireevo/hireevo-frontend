'use client';

import { useRef } from 'react';
import { cn } from '@hireevo/ui-web';
import type { EDUCATION_FIELDS, LICENSE_FIELDS } from './entries-validation.ts';
import { DATE_INPUT, border } from './entry-fields.ts';
import { EntryPanel, ListHeader } from './entry-panel.tsx';
import { SECTION_LIMITS } from './limits.ts';
import { CONTROL, SetupField } from './setup-field.tsx';
import { errorKey, type Entries } from './use-entries.ts';

export type EducationField = (typeof EDUCATION_FIELDS)[number];
export type LicenseField = (typeof LICENSE_FIELDS)[number];

/**
 * Where someone studied.
 *
 * Its own list, like the licenses below it: profile setup shows the two in one
 * step, and the client profile gives each a card of its own.
 */
export function EducationList({ education }: { education: Entries<EducationField> }) {
  const addEducation = useRef<HTMLButtonElement>(null);

  return (
    <>
      <ListHeader
        title="Education"
        addLabel="Add education"
        addRef={addEducation}
        onAdd={() => education.add()}
      />
      <div className="mt-3 flex flex-col gap-3">
        {education.items.map((item, index) => {
          const error = (field: EducationField) => education.errors[errorKey(item.key, field)];
          const bind = (field: EducationField) => ({
            name: field,
            value: item.values[field],
            onChange: (event: { target: { value: string } }) =>
              education.update(item.key, field, event.target.value),
            className: cn(CONTROL, 'h-10', border(error(field))),
          });
          return (
            <EntryPanel
              key={item.key}
              entryKey={item.key}
              label={`Institution ${index + 1}`}
              removeLabel={`Remove institution ${index + 1}`}
              onRemove={() => {
                education.remove(item.key);
                addEducation.current?.focus();
              }}
              focusOnMount={item.key === education.lastAdded}
            >
              {() => (
                <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2">
                  <SetupField label="Institution" error={error('institution')}>
                    {(control) => (
                      <input
                        {...control}
                        {...bind('institution')}
                        maxLength={SECTION_LIMITS.institution}
                      />
                    )}
                  </SetupField>
                  <SetupField label="Qualification" error={error('qualification')}>
                    {(control) => (
                      <input
                        {...control}
                        {...bind('qualification')}
                        maxLength={SECTION_LIMITS.qualification}
                      />
                    )}
                  </SetupField>
                  <SetupField label="Field of study" error={error('fieldOfStudy')}>
                    {(control) => (
                      <input
                        {...control}
                        {...bind('fieldOfStudy')}
                        maxLength={SECTION_LIMITS.fieldOfStudy}
                      />
                    )}
                  </SetupField>
                  {/* The design marks this date alone as not Optional. */}
                  <SetupField label="Start date" optional={false} error={error('startDate')}>
                    {(control) => <input {...control} {...bind('startDate')} {...DATE_INPUT} />}
                  </SetupField>
                  <SetupField label="End date" error={error('endDate')}>
                    {(control) => <input {...control} {...bind('endDate')} {...DATE_INPUT} />}
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

/** Licenses and certifications, each with who issued it and when it runs out. */
export function LicenseList({ licenses }: { licenses: Entries<LicenseField> }) {
  const addLicense = useRef<HTMLButtonElement>(null);

  return (
    <>
      <ListHeader
        title="Licenses"
        addLabel="Add license"
        addRef={addLicense}
        onAdd={() => licenses.add()}
      />
      <div className="mt-3 flex flex-col gap-3">
        {licenses.items.map((item, index) => {
          const error = (field: LicenseField) => licenses.errors[errorKey(item.key, field)];
          const bind = (field: LicenseField) => ({
            name: field,
            value: item.values[field],
            onChange: (event: { target: { value: string } }) =>
              licenses.update(item.key, field, event.target.value),
            className: cn(CONTROL, 'h-10', border(error(field))),
          });
          return (
            <EntryPanel
              key={item.key}
              entryKey={item.key}
              label={`License ${index + 1}`}
              removeLabel={`Remove license ${index + 1}`}
              onRemove={() => {
                licenses.remove(item.key);
                addLicense.current?.focus();
              }}
              focusOnMount={item.key === licenses.lastAdded}
            >
              {() => (
                <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2">
                  <SetupField label="License" error={error('name')}>
                    {(control) => (
                      <input {...control} {...bind('name')} maxLength={SECTION_LIMITS.license} />
                    )}
                  </SetupField>
                  <SetupField label="Issuer" error={error('issuer')}>
                    {(control) => (
                      <input {...control} {...bind('issuer')} maxLength={SECTION_LIMITS.issuer} />
                    )}
                  </SetupField>
                  <SetupField label="Issued" error={error('issued')}>
                    {(control) => <input {...control} {...bind('issued')} {...DATE_INPUT} />}
                  </SetupField>
                  <SetupField label="Expires" error={error('expires')}>
                    {(control) => <input {...control} {...bind('expires')} {...DATE_INPUT} />}
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
