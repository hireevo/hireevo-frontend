'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { LuPlus } from 'react-icons/lu';
import { Button } from '@hireevo/ui-web';
import { PROFICIENCIES, type ProfileLanguage, type Proficiency } from './draft.ts';

/**
 * The languages HireEvo offers. A short list rather than every ISO 639 entry:
 * the point of the field is matching buyers to sellers, and a picker with 180
 * options is one nobody scrolls to the bottom of.
 */
const LANGUAGES = [
  'Arabic',
  'Bengali',
  'Chinese',
  'English',
  'French',
  'German',
  'Hindi',
  'Italian',
  'Japanese',
  'Korean',
  'Pashto',
  'Portuguese',
  'Punjabi',
  'Russian',
  'Sindhi',
  'Spanish',
  'Turkish',
  'Urdu',
] as const;

const selectClass =
  'h-10 rounded-md border border-border bg-surface px-2 text-sm text-content outline-none focus:border-border-accent';

export type LanguageAdderProps = {
  /** Already-chosen languages, so the picker cannot offer a duplicate. */
  chosen: ProfileLanguage[];
  onAdd: (language: ProfileLanguage) => void;
};

/**
 * The "+ Add languages" control and the row it opens.
 *
 * The frame draws the link but not what it opens, so this is the smallest thing
 * that does the job honestly: the two fields a language chip displays, inline,
 * where the chip will appear. A dialog would be inventing more.
 */
export function LanguageAdder({ chosen, onAdd }: LanguageAdderProps) {
  const [open, setOpen] = useState(false);
  const taken = new Set(chosen.map((language) => language.name));
  const available = LANGUAGES.filter((name) => !taken.has(name));

  const [name, setName] = useState<string>(available[0] ?? '');
  const [proficiency, setProficiency] = useState<Proficiency>('Conversational');

  if (available.length === 0) return null;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setName(available[0] ?? '');
          setOpen(true);
        }}
        className="inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-content-link underline underline-offset-2"
      >
        <LuPlus aria-hidden="true" className="size-4" />
        Add languages
      </button>
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (name === '') return;
    onAdd({ name, proficiency });
    setOpen(false);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2">
      <select
        value={name}
        aria-label="Language"
        onChange={(event) => setName(event.target.value)}
        className={selectClass}
      >
        {available.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <select
        value={proficiency}
        aria-label="Proficiency"
        onChange={(event) => setProficiency(event.target.value as Proficiency)}
        className={selectClass}
      >
        {PROFICIENCIES.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <Button type="submit" size="sm">
        Add
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
        Cancel
      </Button>
    </form>
  );
}
