'use client';

import { useEffect, useState } from 'react';
import { LuAward, LuBriefcaseBusiness, LuGraduationCap, LuStar, LuUser } from 'react-icons/lu';
import { Button } from '@hireevo/ui-web';
import { FormMessage } from '@/features/auth/form-message.tsx';
import { useSession } from '@/features/auth/session.tsx';
import {
  EDUCATION_FIELDS,
  EXPERIENCE_FIELDS,
  LICENSE_FIELDS,
  SKILL_FIELDS,
  OPEN_ENDED,
  normaliseSkill,
} from '@/features/profile-setup/entries-validation.ts';
import { useEntries } from '@/features/profile-setup/use-entries.ts';
import { useProfileDraft } from '@/features/profile-setup/use-profile-draft.ts';
import { displayNameOf } from '@/features/workspace/snapshot.ts';
import { AddButton } from './add-button.tsx';
import { CompletionCard } from './completion-card.tsx';
import { EMPTY_DRAFT, completionOf, type ProfileDraft } from './draft.ts';
import { ProfileHeaderCard } from './profile-header-card.tsx';
import { RecordSection } from './record-section.tsx';
import { RECORD_SPECS } from './record-specs.tsx';
import { SectionCard } from './section-card.tsx';
import {
  EducationEditor,
  ExperienceEditor,
  IdentityEditor,
  LicenseEditor,
  SkillsEditor,
} from './section-editors.tsx';

/**
 * The design shows one language already on the profile, and the footer counting
 * it as the first of five key steps. It is the account's own language rather
 * than something the person added, which is why it is here and not in
 * `EMPTY_DRAFT` — an empty draft is empty.
 */
const STARTING_DRAFT: ProfileDraft = {
  ...EMPTY_DRAFT,
  country: 'Pakistan',
  languages: [{ name: 'English', proficiency: 'Conversational' }],
};

/** Which section is open. One at a time: two long forms at once is a page nobody reads. */
type OpenSection = 'about' | 'skills' | 'experience' | 'education' | 'certifications' | null;

/** Said under a section whose contents the API cannot hold yet. */
const NOT_CONNECTED =
  'Not connected to your profile yet: this section stays on this page and is lost on reload.';

/**
 * The client profile: everything a buyer sees, and the way in to each part of it.
 *
 * Signing in lands here. Identity — the name, headline, biography and
 * availability — is loaded from the profile API and autosaved as it is typed.
 * The lists below it are built but have no API fields yet, so they are held in
 * the page and say so.
 *
 * Each section's editor is fetched when that section is opened, rather than
 * shipped with the page or put behind a dialog or another route: see
 * section-editors.tsx.
 */
export function ProfileBuilder() {
  const { user } = useSession();
  const identity = useProfileDraft(
    user === null ? {} : { fallbackDisplayName: displayNameOf(user) },
  );
  const skills = useEntries('skill', SKILL_FIELDS, { normalise: normaliseSkill });
  const experience = useEntries('role', EXPERIENCE_FIELDS, { optional: OPEN_ENDED.experience });
  const education = useEntries('institution', EDUCATION_FIELDS, { optional: OPEN_ENDED.education });
  const licenses = useEntries('license', LICENSE_FIELDS, { optional: OPEN_ENDED.licenses });

  const [draft, setDraft] = useState<ProfileDraft>(STARTING_DRAFT);
  const [open, setOpen] = useState<OpenSection>(null);

  const unsavedElsewhere = skills.dirty || experience.dirty || education.dirty || licenses.dirty;
  useEffect(() => {
    if (!unsavedElsewhere) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [unsavedElsewhere]);

  if (identity.load.status === 'loading') {
    return (
      <p role="status" className="text-sm text-content-subtle">
        Loading your profile…
      </p>
    );
  }

  if (identity.load.status === 'error') {
    return (
      <div className="flex flex-col items-start gap-4">
        <FormMessage>{identity.load.message}</FormMessage>
        <Button type="button" onClick={() => void identity.reload()}>
          Try again
        </Button>
      </div>
    );
  }

  /** The header card edits the same name and headline the About editor does. */
  const headerDraft: ProfileDraft = {
    ...draft,
    displayName: identity.values.displayName,
    title: identity.values.headline,
  };

  function patchHeader(patch: Partial<ProfileDraft>) {
    const { displayName, title, ...rest } = patch;
    if (displayName !== undefined) identity.change('displayName', displayName);
    if (title !== undefined) identity.change('headline', title);
    if (Object.keys(rest).length > 0) setDraft((current) => ({ ...current, ...rest }));
  }

  const namedSkills = skills.items
    .map((item) => item.values.name.trim())
    .filter((name) => name !== '');

  const completion = completionOf({
    ...headerDraft,
    about: identity.values.overview,
    skills: namedSkills,
  });

  const saveStatus = {
    saved: 'All changes saved',
    saving: 'Saving your changes…',
    // Covers both a pause in typing and the account name filled in on arrival:
    // neither is on the server yet, and the next save sends both.
    unsaved: 'Not saved yet',
    failed: identity.save.kind === 'failed' ? identity.save.message : '',
    conflict: identity.save.kind === 'conflict' ? identity.save.message : '',
  }[identity.save.kind];

  /** Opens a section, or closes it when it is the one already open. */
  const toggle = (section: Exclude<OpenSection, null>) =>
    setOpen((current) => (current === section ? null : section));

  const done = (
    <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(null)}>
      Done
    </Button>
  );

  return (
    <div className="flex flex-col gap-5">
      {/* `minmax(0,1fr)` on the single-column track too: a grid track sized
          `auto` takes its content’s minimum width, which pushed these cards
          wider than a 320px screen. */}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:items-stretch">
        <ProfileHeaderCard
          draft={headerDraft}
          username={user?.username ?? null}
          onChange={patchHeader}
        />
        <CompletionCard completion={completion} />
      </div>

      <p role="status" aria-live="polite" className="-mt-2 text-xs text-content-subtle">
        {saveStatus}
      </p>

      {open === 'about' ? (
        // The step's own card, as the design draws it, in the About card's place.
        <IdentityEditor
          values={identity.values}
          fieldErrors={identity.fieldErrors}
          onChange={identity.change}
          saving={identity.save.kind === 'saving'}
          saveLabel="Save and close"
          requireComplete={false}
          onSaveAndNext={() => {
            void identity.flush().then((saved) => {
              if (saved) setOpen(null);
            });
          }}
        />
      ) : (
        <SectionCard
          title="About"
          description="Share some details about yourself, your expertise, and what you offer."
          icon={<LuUser />}
          action={
            <AddButton onClick={() => toggle('about')}>
              {identity.values.overview === '' ? 'Add details' : 'Edit details'}
            </AddButton>
          }
        >
          {identity.values.overview === '' ? undefined : (
            <p className="text-sm leading-[1.7] whitespace-pre-line text-content-muted">
              {identity.values.overview}
            </p>
          )}
        </SectionCard>
      )}

      <SectionCard
        title="Skills and expertise"
        description="Attract relevant clients by sharing your strengths and abilities."
        icon={<LuStar />}
        action={
          open === 'skills' ? (
            done
          ) : (
            <AddButton onClick={() => toggle('skills')}>
              {namedSkills.length === 0 ? 'Add skills and expertise' : 'Edit skills and expertise'}
            </AddButton>
          )
        }
      >
        {open === 'skills' ? (
          <>
            <SkillsEditor skills={skills} />
            <p className="mt-4 text-xs text-content-warning">{NOT_CONNECTED}</p>
          </>
        ) : namedSkills.length === 0 ? undefined : (
          <p className="text-sm text-content-muted">{namedSkills.join(' · ')}</p>
        )}
      </SectionCard>

      <SectionCard
        title="Work experience"
        optional
        description="Add your job history and achievements to give clients insight into your expertise."
        icon={<LuBriefcaseBusiness />}
        action={
          open === 'experience' ? (
            done
          ) : (
            <AddButton onClick={() => toggle('experience')}>Add work experience</AddButton>
          )
        }
      >
        {open === 'experience' ? (
          <>
            <ExperienceEditor experience={experience} />
            <p className="mt-4 text-xs text-content-warning">{NOT_CONNECTED}</p>
          </>
        ) : undefined}
      </SectionCard>

      {/* The only pair the design puts side by side, and only from `lg` — below
          that the column is too narrow for two of these to hold their shape. */}
      <div className="grid gap-5 lg:grid-cols-2">
        <SectionCard
          title="Education"
          optional
          description="Back up your skills by adding any educational degrees or programs."
          icon={<LuGraduationCap />}
          className={open === 'education' ? 'lg:col-span-2' : ''}
          action={
            open === 'education' ? (
              done
            ) : (
              <AddButton onClick={() => toggle('education')}>Add education</AddButton>
            )
          }
        >
          {open === 'education' ? (
            <>
              <EducationEditor education={education} />
              <p className="mt-4 text-xs text-content-warning">{NOT_CONNECTED}</p>
            </>
          ) : undefined}
        </SectionCard>

        <SectionCard
          title="Certifications"
          optional
          description="Showcase your mastery with certifications earned in your field."
          icon={<LuAward />}
          className={open === 'certifications' ? 'lg:col-span-2' : ''}
          action={
            open === 'certifications' ? (
              done
            ) : (
              <AddButton onClick={() => toggle('certifications')}>Add certifications</AddButton>
            )
          }
        >
          {open === 'certifications' ? (
            <>
              <LicenseEditor licenses={licenses} />
              <p className="mt-4 text-xs text-content-warning">{NOT_CONNECTED}</p>
            </>
          ) : undefined}
        </SectionCard>
      </div>

      {/* Portfolio has no designed editor yet, so it keeps the short record form. */}
      <RecordSection
        spec={RECORD_SPECS.portfolio}
        records={draft.records.portfolio}
        onChange={(records) =>
          setDraft((current) => ({
            ...current,
            records: { ...current.records, portfolio: records },
          }))
        }
      />
    </div>
  );
}
