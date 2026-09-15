'use client';

import { useId, useRef, useState } from 'react';
import { LuArrowRight, LuChevronDown } from 'react-icons/lu';
import { Button, Card, cn } from '@hireevo/ui-web';
import type { LANGUAGE_FIELDS, SKILL_FIELDS } from './entries-validation.ts';
import { EntryPanel, ListHeader } from './entry-panel.tsx';
import { SECTION_LIMITS } from './limits.ts';
import { CONTROL, SetupField } from './setup-field.tsx';
import { APPROVED_SKILLS, PROFICIENCIES, languageOptions } from './skill-options.ts';
import { StaticDatalist } from './static-datalist.tsx';
import { StepFooter, focusFirstProblem } from './step-footer.tsx';
import { StepHeader } from './step-header.tsx';
import { sectionIdFor } from './steps.ts';
import { errorKey, type Entries } from './use-entries.ts';

type LanguageField = (typeof LANGUAGE_FIELDS)[number];
type SkillField = (typeof SKILL_FIELDS)[number];

const border = (error: string | undefined) =>
  error === undefined ? 'border-border' : 'border-border-danger';

export function SkillsStep({
  languages,
  skills,
  onSaveAndNext,
}: {
  languages: Entries<LanguageField>;
  skills: Entries<SkillField>;
  /** Answers whether the step was accepted and the screen moved on. */
  onSaveAndNext: () => boolean;
}) {
  const headingId = useId();
  const pickerId = useId();
  const languageListId = useId();
  const proficiencyListId = useId();
  const fields = useRef<HTMLDivElement>(null);
  const addLanguage = useRef<HTMLButtonElement>(null);
  const addSkill = useRef<HTMLButtonElement>(null);
  const [picked, setPicked] = useState<string>(APPROVED_SKILLS[0]);
  const [notice, setNotice] = useState('');

  function addApproved() {
    const wanted = picked.toLowerCase();
    if (skills.items.some((item) => item.values.name.trim().toLowerCase() === wanted)) {
      setNotice(`${picked} is already in your skills.`);
      return;
    }
    // Fill the untouched entry the list starts with before adding another.
    const untouched = skills.items.find((item) =>
      Object.values(item.values).every((value) => value === ''),
    );
    if (untouched === undefined) {
      skills.add({ name: picked });
    } else {
      skills.update(untouched.key, 'name', picked);
      setTimeout(() => {
        document
          .querySelector<HTMLElement>(`[data-entry="${untouched.key}"] [name="proficiency"]`)
          ?.focus();
      }, 0);
    }
    setNotice(`${picked} added to your skills.`);
  }

  function saveAndNext() {
    if (!onSaveAndNext()) focusFirstProblem(fields.current);
  }

  return (
    <Card
      id={sectionIdFor('skills')}
      aria-labelledby={headingId}
      className="scroll-mt-6 rounded-xl p-5 sm:p-6"
    >
      <StepHeader
        id={headingId}
        number={3}
        title="Languages and skills"
        description="Choose approved taxonomy skills where possible. Existing self-declared labels remain intact."
      />

      <div ref={fields} className="mt-5 border-t border-border-subtle pt-5">
        <ListHeader
          title="Languages"
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
                      list={languageListId}
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

        <div className="mt-6">
          <ListHeader
            title="Skills"
            addLabel="Add skill"
            addRef={addSkill}
            onAdd={() => skills.add()}
          />

          <div className="mt-3 flex flex-col gap-3 rounded-lg bg-surface-accent-subtle p-3 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="relative sm:w-48">
              <label htmlFor={pickerId} className="sr-only">
                Approved skill
              </label>
              <select
                id={pickerId}
                value={picked}
                onChange={(event) => {
                  setPicked(event.target.value);
                  setNotice('');
                }}
                className={cn(CONTROL, 'h-9 appearance-none border-border pr-9')}
              >
                {APPROVED_SKILLS.map((skill) => (
                  <option key={skill} value={skill}>
                    {skill}
                  </option>
                ))}
              </select>
              <LuChevronDown
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-content-subtle"
              />
            </div>
            <Button
              type="button"
              onClick={addApproved}
              className="h-9 w-full rounded-md px-3 text-xs font-semibold sm:w-auto"
            >
              Add approved skill
            </Button>
            <button
              type="button"
              onClick={() => skills.add()}
              className="inline-flex min-h-6 items-center gap-1 self-start rounded-sm text-xs font-medium text-content-link underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus sm:self-auto"
            >
              Can’t find it? Suggest a skill
              <LuArrowRight aria-hidden="true" className="size-3.5" />
            </button>
            <p
              role="status"
              className={notice === '' ? 'sr-only' : 'text-xs text-content sm:basis-full'}
            >
              {notice}
            </p>
          </div>

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
                            onChange={(event) =>
                              skills.update(item.key, 'name', event.target.value)
                            }
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
                            onChange={(event) =>
                              skills.update(item.key, 'years', event.target.value)
                            }
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
        </div>
      </div>

      <StaticDatalist id={languageListId} options={languageOptions()} />
      <StaticDatalist id={proficiencyListId} options={PROFICIENCIES} />

      <StepFooter complete={!languages.incomplete && !skills.incomplete} onContinue={saveAndNext} />
    </Card>
  );
}
