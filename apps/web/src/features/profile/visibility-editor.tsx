'use client';

import { useId } from 'react';
import { Checkbox, cn } from '@hireevo/ui-web';
import type { OwnProfile } from '@/features/profile-setup/api.ts';
import { StepFooter } from '@/features/profile-setup/step-footer.tsx';
import {
  PUBLIC_SECTIONS,
  useVisibilityDraft,
  type VisibilityMode,
} from '@/features/profile-setup/use-visibility-draft.ts';

const MODES: readonly { value: VisibilityMode; label: string }[] = [
  { value: 'private', label: 'Private draft' },
  { value: 'public', label: 'Public after publishing' },
];

/**
 * Who may see the profile once it is published.
 *
 * This is the one part of the page with a save of its own. Everything else is
 * the profile and goes in the one request at the foot of the form; visibility
 * is its own endpoint, and who may see someone's work is a decision worth
 * making deliberately rather than as a side effect of typing.
 */
export function VisibilityEditor({
  draft,
}: {
  draft: {
    profile: OwnProfile | null;
    version: () => number;
    flush: () => Promise<boolean>;
    adopt: (profile: OwnProfile) => void;
  };
}) {
  const visibility = useVisibilityDraft(draft);
  const errorId = useId();
  const { values, error } = visibility;

  return (
    <div>
      <fieldset>
        <legend className="sr-only">Who can see your profile</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {MODES.map((mode) => {
            const selected = values.mode === mode.value;
            return (
              <label
                key={mode.value}
                className={cn(
                  'flex min-h-10 cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-[0.8125rem] text-content transition-colors',
                  'has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-focus',
                  selected
                    ? 'border-border-accent bg-surface-accent-subtle'
                    : 'border-border-subtle bg-surface hover:border-border',
                )}
              >
                <span className="relative flex size-4 shrink-0 items-center justify-center">
                  <input
                    type="radio"
                    name="client-profile-visibility"
                    value={mode.value}
                    checked={selected}
                    onChange={() => visibility.setMode(mode.value)}
                    className="peer size-4 appearance-none rounded-full border border-border-strong bg-surface outline-none checked:border-accent"
                  />
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute size-2 rounded-full bg-accent opacity-0 peer-checked:opacity-100"
                  />
                </span>
                {mode.label}
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="mt-6" aria-describedby={error === null ? undefined : errorId}>
        <legend className="text-xs font-medium tracking-wide text-content-subtle uppercase">
          Sections allowed on the public profile
        </legend>
        <div className="mt-3 grid gap-x-4 gap-y-3 sm:grid-cols-2">
          {PUBLIC_SECTIONS.map((section) => (
            <Checkbox
              key={section.id}
              name={`public-${section.id}`}
              checked={values.sections[section.id]}
              aria-invalid={error === null ? undefined : true}
              onChange={(event) => visibility.toggle(section.id, event.target.checked)}
              className="min-h-6 text-[0.8125rem]"
            >
              {section.label}
            </Checkbox>
          ))}
        </div>
        {error === null ? null : (
          <p id={errorId} role="alert" className="mt-3 text-xs text-content-warning">
            {error}
          </p>
        )}
      </fieldset>

      <div className="mt-6 border-t border-border-subtle pt-5">
        <Checkbox
          name="indexable"
          checked={values.indexable}
          onChange={(event) => visibility.setIndexable(event.target.checked)}
          className="min-h-6 text-[0.8125rem]"
        >
          Allow search engines to index the public profile
        </Checkbox>
      </div>

      {/* The design draws no confirmation, but a save with no sign of having
          happened is one people press twice. */}
      <p role="status" aria-live="polite" className="mt-4 text-xs text-content-subtle">
        {visibility.saved ? 'Visibility saved.' : ''}
      </p>

      {/* The same footer the setup step uses: this is the same decision, drawn
          the same way. */}
      <StepFooter
        complete
        onContinue={() => void visibility.save()}
        loading={visibility.saving}
        label="Save section"
        arrow={false}
      />
    </div>
  );
}
