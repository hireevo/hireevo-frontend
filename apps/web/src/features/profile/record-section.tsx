'use client';

import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { LuTrash2 } from 'react-icons/lu';
import { Button, TextField } from '@hireevo/ui-web';
import { AddButton } from './add-button.tsx';
import type { ProfileRecord } from './draft.ts';
import { SectionCard } from './section-card.tsx';
import { SummaryList } from './section-summaries.tsx';

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
  /** True while this section's editor is open. */
  open: boolean;
  /**
   * The control in the section's corner, decided where every other section's
   * is: a way in while it is empty, a pencil once it holds something and
   * editing is on, and nothing at all otherwise.
   */
  action: ReactNode;
  className?: string;
};

const blank = (fields: RecordField[]) =>
  Object.fromEntries(fields.map((field) => [field.name, '']));

/**
 * A section holding a list of short records — the portfolio.
 *
 * The design draws only its empty state, so the form behind the control has no
 * frame to follow. It opens and closes like every other section on the page, so
 * that "Complete your profile" means the same thing here as it does there:
 * closed, it shows what is in it and nothing to press; open, it can be added to
 * and pruned.
 */
export function RecordSection({
  spec,
  records,
  onChange,
  open,
  action,
  className,
}: RecordSectionProps) {
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
      editing={open}
      action={action}
    >
      {!open ? (
        records.length === 0 ? undefined : (
          <SummaryList
            rows={records.map((record) => {
              const { primary, secondary } = spec.summary(record.fields);
              return { key: record.id, primary, secondary };
            })}
          />
        )
      ) : (
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

          {draft === null ? (
            <AddButton onClick={() => setDraft(blank(spec.fields))}>{spec.addLabel}</AddButton>
          ) : (
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
