'use client';

import { useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import { LuStar } from 'react-icons/lu';
import { Button, Chip } from '@hireevo/ui-web';
import { AddButton } from './add-button.tsx';
import { SectionCard } from './section-card.tsx';

const MAX_SKILLS = 15;

export type SkillsSectionProps = {
  value: string[];
  onChange: (value: string[]) => void;
};

export function SkillsSection({ value, onChange }: SkillsSectionProps) {
  const [editing, setEditing] = useState(false);
  const [entry, setEntry] = useState('');

  const full = value.length >= MAX_SKILLS;

  function add() {
    const skill = entry.trim();
    // Case-insensitive: "React" and "react" are one skill to a buyer searching,
    // so letting both in makes the list look careless for no benefit.
    const exists = value.some((known) => known.toLowerCase() === skill.toLowerCase());
    if (skill === '' || exists || full) return;
    onChange([...value, skill]);
    setEntry('');
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    // Comma as well as Enter: people paste and type skill lists comma-separated,
    // and a comma that lands in the middle of a chip is a small papercut.
    if (event.key !== 'Enter' && event.key !== ',') return;
    event.preventDefault();
    add();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    add();
  }

  return (
    <SectionCard
      title="Skills and expertise"
      description="Attract relevant clients by sharing your strengths and abilities."
      icon={<LuStar />}
      action={
        editing ? (
          <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
            Done
          </Button>
        ) : (
          <AddButton onClick={() => setEditing(true)}>
            {value.length === 0 ? 'Add skills and expertise' : 'Edit skills and expertise'}
          </AddButton>
        )
      }
    >
      {value.length === 0 && !editing ? undefined : (
        <div className="flex flex-col gap-4">
          {value.length === 0 ? null : (
            <ul className="flex flex-wrap gap-2">
              {value.map((skill) => (
                <li key={skill}>
                  <Chip
                    removeLabel={`Remove ${skill}`}
                    {...(editing
                      ? { onRemove: () => onChange(value.filter((kept) => kept !== skill)) }
                      : {})}
                  >
                    {skill}
                  </Chip>
                </li>
              ))}
            </ul>
          )}

          {editing ? (
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
              <label htmlFor="skill-entry" className="sr-only">
                Add a skill
              </label>
              <input
                id="skill-entry"
                autoFocus
                value={entry}
                disabled={full}
                onChange={(event) => setEntry(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={full ? `That is all ${MAX_SKILLS}` : 'Type a skill and press Enter'}
                className="h-10 w-full max-w-72 rounded-md border border-border bg-surface px-3 text-sm text-content outline-none focus:border-border-accent disabled:cursor-not-allowed disabled:opacity-60"
              />
              <Button type="submit" size="sm" disabled={full}>
                Add
              </Button>
              <span className="text-xs text-content-subtle">
                {value.length} of {MAX_SKILLS}
              </span>
            </form>
          ) : null}
        </div>
      )}
    </SectionCard>
  );
}
