'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { LuUser } from 'react-icons/lu';
import { Button } from '@hireevo/ui-web';
import { AddButton } from './add-button.tsx';
import { SectionCard } from './section-card.tsx';

const MAX = 600;

export type AboutSectionProps = {
  value: string;
  onChange: (value: string) => void;
};

export function AboutSection({ value, onChange }: AboutSectionProps) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onChange(text.trim());
    setEditing(false);
  }

  return (
    <SectionCard
      title="About"
      description="Share some details about yourself, your expertise, and what you offer."
      icon={<LuUser />}
      action={
        editing ? null : (
          <AddButton
            onClick={() => {
              setText(value);
              setEditing(true);
            }}
          >
            {value === '' ? 'Add details' : 'Edit details'}
          </AddButton>
        )
      }
    >
      {editing ? (
        <form onSubmit={handleSubmit}>
          <label htmlFor="about-text" className="sr-only">
            About you
          </label>
          <textarea
            id="about-text"
            autoFocus
            rows={5}
            maxLength={MAX}
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="I design and build web products for early-stage teams…"
            className="w-full rounded-md border border-border bg-surface p-3 text-sm leading-[1.6] text-content outline-none focus:border-border-accent"
          />
          <div className="mt-3 flex items-center gap-3">
            <Button type="submit" size="sm">
              Save
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            {/* A countdown, not a limit announced after the fact: `maxLength`
                silently stops accepting keystrokes, which reads as a broken
                keyboard unless the remaining count is on screen. */}
            <span className="ml-auto text-xs text-content-subtle">
              {MAX - text.length} characters left
            </span>
          </div>
        </form>
      ) : value === '' ? undefined : (
        <p className="text-sm leading-[1.7] whitespace-pre-line text-content-muted">{value}</p>
      )}
    </SectionCard>
  );
}
