'use client';

import { useId, useRef } from 'react';
import { cn } from '@hireevo/ui-web';
import type { LANGUAGE_FIELDS, SKILL_FIELDS } from './entries-validation.ts';
import { border } from './entry-fields.ts';
import { EntryPanel, ListHeader } from './entry-panel.tsx';
import { SECTION_LIMITS } from './limits.ts';
import { CONTROL, SetupField } from './setup-field.tsx';
import { PROFICIENCIES, languageOptions } from './skill-options.ts';
import { StaticDatalist } from './static-datalist.tsx';
import { errorKey, type Entries } from './use-entries.ts';

export type LanguageField = (typeof LANGUAGE_FIELDS)[number];
export type SkillField = (typeof SKILL_FIELDS)[number];

/**
 * The languages someone speaks.
 *
 * A list of its own rather than part of the skills step, because the client
 * profile shows languages beside the person's name and skills in a card of
 * their own — the same list has to sit in both places.
 */
export function LanguagesList({
  languages,
  heading = true,
}: {
  languages: Entries<LanguageField>;
  /** Off where the card around this list already says what it is. */
  heading?: boolean;
}) {
  const listId = useId();
  const addLanguage = useRef<HTMLButtonElement>(null);

  return (
    <>
      <ListHeader
        {...(heading ? { title: 'Languages' } : {})}
        addLabel="Add language"
        addRef={addLanguage}
        onAdd={() => languages.add()}
      />
      <div className="mt-3 flex flex-col gap-3">
        {languages.items.map((item, index) => {
          const error = languages.errors[errorKey(item.key, 'name')];
          const errorId = `${item.key}-error`;
          return (
            <EntryPanel
              key={item.key}
              entryKey={item.key}
              label={`Language ${index + 1}`}
              removeLabel={`Remove language ${index + 1}`}
              onRemove={() => {
                languages.remove(item.key);
                addLanguage.current?.focus();
              }}
              focusOnMount={item.key === languages.lastAdded}
            >
              {(labelId) => (
                <>
                  <input
                    name="language"
                    aria-labelledby={labelId}
                    aria-invalid={error === undefined ? undefined : true}
                    aria-describedby={error === undefined ? undefined : errorId}
                    list={listId}
                    autoComplete="off"
                    value={item.values.name}
                    maxLength={SECTION_LIMITS.language}
                    onChange={(event) => languages.update(item.key, 'name', event.target.value)}
                    className={cn(CONTROL, 'h-10', border(error))}
                  />
                  {error === undefined ? null : (
                    <p id={errorId} role="alert" className="mt-1.5 text-xs text-content-warning">
                      {error}
                    </p>
                  )}
                </>
              )}
            </EntryPanel>
          );
        })}
      </div>
      <StaticDatalist id={listId} options={languageOptions()} />
    </>
  );
}

/**
 * The skills someone lists, typed in their own words.
 *
 * There used to be a picker above it — a menu of approved skills, a button that
 * copied one into the list, and a link that asked for one the taxonomy did not
 * have. It is gone at the owner's request: the list below is where a skill is
 * written, and the API decides afterwards whether it matches an approved one.
 */
export function SkillsList({
  skills,
  heading = true,
}: {
  skills: Entries<SkillField>;
  /** Off where the card around this list already says what it is. */
  heading?: boolean;
}) {
  const proficiencyListId = useId();
  const addSkill = useRef<HTMLButtonElement>(null);

  return (
    <>
      <ListHeader
        {...(heading ? { title: 'Skills' } : {})}
        addLabel="Add skill"
        addRef={addSkill}
        onAdd={() => skills.add()}
      />

      <div className="mt-3 flex flex-col gap-3">
        {skills.items.map((item, index) => {
          const error = (field: SkillField) => skills.errors[errorKey(item.key, field)];
          return (
            <EntryPanel
              key={item.key}
              entryKey={item.key}
              label={`Skill ${index + 1}`}
              removeLabel={`Remove skill ${index + 1}`}
              onRemove={() => {
                skills.remove(item.key);
                addSkill.current?.focus();
              }}
              focusOnMount={item.key === skills.lastAdded}
            >
              {() => (
                <div className="grid gap-x-3 gap-y-4 sm:grid-cols-3">
                  <SetupField label="Skill" error={error('name')}>
                    {(control) => (
                      <input
                        {...control}
                        name="skill"
                        value={item.values.name}
                        maxLength={SECTION_LIMITS.skill}
                        onChange={(event) => skills.update(item.key, 'name', event.target.value)}
                        className={cn(CONTROL, 'h-10', border(error('name')))}
                      />
                    )}
                  </SetupField>
                  <SetupField label="Proficiency" error={error('proficiency')}>
                    {(control) => (
                      <input
                        {...control}
                        name="proficiency"
                        list={proficiencyListId}
                        autoComplete="off"
                        value={item.values.proficiency}
                        onChange={(event) =>
                          skills.update(item.key, 'proficiency', event.target.value)
                        }
                        className={cn(CONTROL, 'h-10', border(error('proficiency')))}
                      />
                    )}
                  </SetupField>
                  <SetupField label="Years" error={error('years')}>
                    {(control) => (
                      <input
                        {...control}
                        name="years"
                        inputMode="numeric"
                        autoComplete="off"
                        value={item.values.years}
                        maxLength={SECTION_LIMITS.years}
                        onChange={(event) => skills.update(item.key, 'years', event.target.value)}
                        className={cn(CONTROL, 'h-10 tabular-nums', border(error('years')))}
                      />
                    )}
                  </SetupField>
                </div>
              )}
            </EntryPanel>
          );
        })}
      </div>

      <StaticDatalist id={proficiencyListId} options={PROFICIENCIES} />
    </>
  );
}
