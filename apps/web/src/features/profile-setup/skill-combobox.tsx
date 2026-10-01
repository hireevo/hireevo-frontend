'use client';

import { useId, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { cn } from '@hireevo/ui-web';
import { border } from './entry-fields.ts';
import { CONTROL, type FieldControlProps } from './setup-field.tsx';
import { useSkillSuggestions } from './skill-suggestions.ts';

/**
 * The skill name field with a typeahead of approved skills.
 *
 * A person types and a short list of matching approved skills drops down to
 * pick from — "No" offers "Node.js" — but the field is still free text: anything
 * can be typed and kept, and the profile settles which words are approved on the
 * save. The suggestions are a shortcut, never a gate.
 *
 * A listbox combobox rather than a native `<datalist>`: the list is fetched as
 * the person types (the taxonomy runs to thousands, too many to ship to the
 * browser), which a datalist cannot do, and this way the keyboard, the
 * highlight and the exact markup are ours to get right.
 */
export function SkillCombobox({
  control,
  value,
  onChange,
  maxLength,
  error,
}: {
  control: FieldControlProps;
  value: string;
  onChange: (value: string) => void;
  maxLength?: number | undefined;
  error?: string | undefined;
}) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  // Only fetch while the dropdown is meant to be open, so a blurred field makes
  // no requests.
  const suggestions = useSkillSuggestions(open ? value : '');

  // What is already typed exactly is not worth offering back.
  const options = suggestions.filter((name) => name.toLowerCase() !== value.trim().toLowerCase());
  const show = open && options.length > 0;

  function pick(name: string) {
    onChange(name);
    setOpen(false);
    setActive(-1);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      setOpen(false);
      setActive(-1);
      return;
    }
    if (!show) {
      if (event.key === 'ArrowDown' && value.trim() !== '') setOpen(true);
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((index) => (index + 1) % options.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((index) => (index <= 0 ? options.length - 1 : index - 1));
    } else if (event.key === 'Enter' && active >= 0) {
      event.preventDefault();
      const chosen = options[active];
      if (chosen !== undefined) pick(chosen);
    }
  }

  return (
    <div className="relative">
      <input
        {...control}
        role="combobox"
        aria-expanded={show}
        aria-controls={listId}
        aria-autocomplete="list"
        {...(show && active >= 0 ? { 'aria-activedescendant': `${listId}-${active}` } : {})}
        // The browser's own saved-value autofill would fight a live suggestion
        // list, so it is off here; the suggestions are the help this field needs.
        autoComplete="off"
        name="skill"
        value={value}
        maxLength={maxLength}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        // Closed on blur — but the options use `onMouseDown`, which fires before
        // blur, so a click still registers the pick.
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        className={cn(CONTROL, 'h-10', border(error))}
      />

      {show ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border border-border bg-surface py-1 shadow-md"
        >
          {options.map((name, index) => (
            <li
              key={name}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === active}
              onMouseDown={(event) => {
                event.preventDefault();
                pick(name);
              }}
              onMouseEnter={() => setActive(index)}
              className={cn(
                'cursor-pointer px-3 py-2 text-sm',
                index === active
                  ? 'bg-surface-accent-subtle text-content-accent'
                  : 'text-content hover:bg-surface-subtle',
              )}
            >
              {name}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
