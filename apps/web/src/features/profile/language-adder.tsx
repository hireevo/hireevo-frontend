'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { LuInfo, LuPlus, LuStar } from 'react-icons/lu';
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

const fieldClass =
  'h-12 w-full rounded-lg border border-border-subtle bg-surface px-4 text-base text-content outline-none focus:border-border-accent';

export type LanguageAdderProps = {
  /** Already-chosen languages, so the picker cannot offer a duplicate. */
  chosen: ProfileLanguage[];
  onAdd: (language: ProfileLanguage) => void;
};

/**
 * The "+ Add languages" control and the form it opens.
 *
 * The form is a panel rather than a dialog: it opens where the chips it adds to
 * already are, so nothing is hidden behind it and nothing has to trap focus to
 * be safe. The note at the top is there because "proficiency" invites people to
 * flatter themselves, and saying what the field is *for* — agreeing
 * expectations with a client — is what makes an honest answer the obvious one.
 */
export function LanguageAdder({ chosen, onAdd }: LanguageAdderProps) {
  const [open, setOpen] = useState(false);
  const taken = new Set(chosen.map((language) => language.name));
  const available = LANGUAGES.filter((name) => !taken.has(name));

  const [name, setName] = useState<string>(available[0] ?? '');
  const [proficiency, setProficiency] = useState<Proficiency>('Conversational');
  const [starred, setStarred] = useState(false);

  if (available.length === 0) return null;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setName(available[0] ?? '');
          setStarred(false);
          setOpen(true);
        }}
        // `min-h-6`: 24px is the smallest a target may be (WCAG 2.5.8), and the
        // text alone measured 20.
        className="inline-flex min-h-6 items-center gap-1.5 rounded-md text-sm font-medium text-content-link underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        <LuPlus aria-hidden="true" className="size-4" />
        Add languages
      </button>
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (name === '') return;
    onAdd({ name, proficiency, starred });
    setOpen(false);
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full min-w-0 flex-col gap-3">
      <p className="flex items-start gap-3 rounded-xl bg-surface-accent-subtle p-4 text-sm leading-[1.6] text-content-accent">
        <LuInfo aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <span>
          Add the languages you work in and your proficiency level to align expectations with
          clients.
        </span>
      </p>

      <select
        value={name}
        aria-label="Language"
        onChange={(event) => setName(event.target.value)}
        className={fieldClass}
      >
        {available.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>

      <select
        value={proficiency}
        aria-label="Proficiency level"
        onChange={(event) => setProficiency(event.target.value as Proficiency)}
        className={fieldClass}
      >
        {PROFICIENCIES.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>

      {/* A checkbox rather than a button: it is a setting being chosen, not an
          action being taken, and it is read out as on or off without anyone
          having to infer that from a filled-in icon. */}
      <label className="flex w-fit cursor-pointer items-center gap-2.5 rounded-md py-1 text-sm text-content-muted focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus">
        <input
          type="checkbox"
          checked={starred}
          onChange={(event) => setStarred(event.target.checked)}
          className="sr-only"
        />
        <LuStar
          aria-hidden="true"
          className={`size-4 shrink-0 ${starred ? 'fill-current text-content-warning' : 'text-content-subtle'}`}
        />
        Show this one beside my name
      </label>

      <div className="flex flex-wrap justify-end gap-3">
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button type="submit" size="sm">
          Add
        </Button>
      </div>
    </form>
  );
}
