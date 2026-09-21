'use client';

import type { ReactNode } from 'react';
import { LuGlobe, LuStar, LuTrash2 } from 'react-icons/lu';
import { Chip } from '@hireevo/ui-web';
import type { ProfileLanguage } from './draft.ts';
import { LanguageAdder } from './language-adder.tsx';
import { SectionCard } from './section-card.tsx';

export type LanguagesSectionProps = {
  languages: ProfileLanguage[];
  onChange: (languages: ProfileLanguage[]) => void;
  open: boolean;
  action: ReactNode;
  className?: string;
};

/**
 * The languages someone works in, and which of them sit beside their name.
 *
 * Adding happens here rather than on the card at the top of the page, which is
 * where it used to. That card shows only the starred ones now — it is the same
 * card the published profile draws — so the control that added a language was
 * in the one place a newly added language would usually not appear.
 *
 * The whole list lives here, starred or not: starring is done in this section,
 * and a language hidden from its own editor is one nobody can unstar.
 */
export function LanguagesSection({
  languages,
  onChange,
  open,
  action,
  className,
}: LanguagesSectionProps) {
  const toggleStar = (name: string) =>
    onChange(
      languages.map((language) =>
        language.name === name ? { ...language, starred: !language.starred } : language,
      ),
    );

  const remove = (name: string) => onChange(languages.filter((language) => language.name !== name));

  return (
    <SectionCard
      title="Languages"
      optional
      description="Add the languages you work in, and star the ones to show beside your name."
      icon={<LuGlobe />}
      className={className}
      editing={open}
      action={action}
    >
      {!open ? (
        languages.length === 0 ? undefined : (
          <ul className="flex flex-wrap gap-2">
            {languages.map((language) => (
              // `Chip` is a span, so it needs an `li` around it rather than
              // sitting in the list directly — a `ul` whose children are spans
              // is not a list to anything reading the page aloud.
              <li key={language.name}>
                <Chip>
                  {!language.starred ? null : (
                    <LuStar
                      aria-hidden="true"
                      className="size-3.5 shrink-0 fill-current text-content-warning"
                    />
                  )}
                  {language.name} &middot; {language.proficiency}
                  {!language.starred ? null : (
                    <span className="sr-only">, shown beside my name</span>
                  )}
                </Chip>
              </li>
            ))}
          </ul>
        )
      ) : (
        <div className="flex flex-col gap-4">
          {languages.length === 0 ? null : (
            <ul className="flex flex-col gap-2">
              {languages.map((language) => (
                <li
                  key={language.name}
                  className="flex items-center gap-3 rounded-lg border border-border-subtle px-3 py-2"
                >
                  {/* A toggle button rather than a checkbox here: the row is a
                      list item being arranged, and the pressed state is what
                      says whether this one is shown beside the name. */}
                  <button
                    type="button"
                    onClick={() => toggleStar(language.name)}
                    aria-pressed={language.starred}
                    className="flex size-8 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                  >
                    <LuStar
                      aria-hidden="true"
                      className={`size-4 ${language.starred ? 'fill-current text-content-warning' : 'text-content-subtle'}`}
                    />
                    <span className="sr-only">
                      {language.starred
                        ? `Stop showing ${language.name} beside my name`
                        : `Show ${language.name} beside my name`}
                    </span>
                  </button>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-content">
                      {language.name}
                    </span>
                    <span className="block truncate text-sm text-content-subtle">
                      {language.proficiency}
                    </span>
                  </span>

                  <button
                    type="button"
                    onClick={() => remove(language.name)}
                    className="flex size-8 shrink-0 items-center justify-center rounded-md text-content-subtle transition-colors hover:bg-surface-danger-subtle hover:text-content-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                  >
                    <LuTrash2 aria-hidden="true" className="size-4" />
                    <span className="sr-only">Remove {language.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <LanguageAdder
            chosen={languages}
            onAdd={(language) => onChange([...languages, language])}
          />
        </div>
      )}
    </SectionCard>
  );
}
