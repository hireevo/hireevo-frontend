'use client';

import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { LuTrash2 } from 'react-icons/lu';
import { Button, TextField } from '@hireevo/ui-web';
import { AddButton } from './add-button.tsx';
import type { ProfileRecord } from './draft.ts';
import { SectionCard } from './section-card.tsx';

export type RecordField = {
  name: string;
  label: string;
  type?: 'text' | 'url' | 'month';
  placeholder?: string;
  required?: boolean;
  /** Puts the field on its own row rather than sharing one with its neighbour. */
  wide?: boolean;
};

export type RecordSpec = {
  title: string;
  description: string;
  icon: ReactNode;
  addLabel: string;
  /** Names one entry: "experience", "certification". Used in remove labels. */
  noun: string;
  fields: RecordField[];
  /** The two lines an entry shows once saved. */
  summary: (fields: Record<string, string>) => { primary: string; secondary: string };
};

export type RecordSectionProps = {
  spec: RecordSpec;
  records: ProfileRecord[];
  onChange: (records: ProfileRecord[]) => void;
  className?: string;
};

const blank = (fields: RecordField[]) =>
  Object.fromEntries(fields.map((field) => [field.name, '']));

/**
 * The four "(Optional)" sections: work experience, education, certifications
 * and portfolio.
 *
 * The design draws only their empty state — a heading, a line of copy and an
 * "Add" control — so the editor behind that control has no frame to follow.
 * All four hold a list of short records, so they share one form driven by the
 * field list in their spec. Keeping it in one place is what makes it cheap to
 * throw away once those screens are designed.
 */
export function RecordSection({ spec, records, onChange, className }: RecordSectionProps) {
  const [draft, setDraft] = useState<Record<string, string> | null>(null);

  const required = spec.fields.filter((field) => field.required === true);
  const complete =
    draft !== null && required.every((field) => (draft[field.name] ?? '').trim() !== '');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (draft === null || !complete) return;
    const fields = Object.fromEntries(
      Object.entries(draft).map(([key, value]) => [key, value.trim()]),
    );
    onChange([...records, { id: crypto.randomUUID(), fields }]);
    setDraft(null);
  }

  return (
    <SectionCard
      title={spec.title}
      optional
      description={spec.description}
      icon={spec.icon}
      className={className}
      action={
        draft === null ? (
          <AddButton onClick={() => setDraft(blank(spec.fields))}>{spec.addLabel}</AddButton>
        ) : null
      }
    >
      {records.length === 0 && draft === null ? undefined : (
        <div className="flex flex-col gap-4">
          {records.length === 0 ? null : (
            <ul className="flex flex-col gap-3">
              {records.map((record) => {
                const { primary, secondary } = spec.summary(record.fields);
                return (
                  <li
                    key={record.id}
                    className="flex items-start gap-3 rounded-lg border border-border-subtle p-4"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-content">
                        {primary}
                      </span>
                      {secondary === '' ? null : (
                        <span className="mt-0.5 block truncate text-sm text-content-subtle">
                          {secondary}
                        </span>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => onChange(records.filter((kept) => kept.id !== record.id))}
                      className="flex size-8 shrink-0 items-center justify-center rounded-md text-content-subtle transition-colors hover:bg-surface-danger-subtle hover:text-content-danger"
                    >
                      <LuTrash2 aria-hidden="true" className="size-4" />
                      <span className="sr-only">
                        Remove {spec.noun}: {primary}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {draft === null ? null : (
            <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
              {spec.fields.map((field) => (
                <TextField
                  key={field.name}
                  label={field.label}
                  type={field.type ?? 'text'}
                  value={draft[field.name] ?? ''}
                  placeholder={field.placeholder ?? ''}
                  required={field.required === true}
                  onChange={(event) => setDraft({ ...draft, [field.name]: event.target.value })}
                  className={field.wide === true ? 'sm:col-span-2' : ''}
                />
              ))}
              <div className="flex items-center gap-3 sm:col-span-2">
                <Button type="submit" size="sm" disabled={!complete}>
                  Save
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setDraft(null)}>
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </div>
      )}
    </SectionCard>
  );
}
