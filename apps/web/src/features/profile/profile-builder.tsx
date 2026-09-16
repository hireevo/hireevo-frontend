'use client';

import { useEffect, useState } from 'react';
import { LuAward, LuBriefcaseBusiness, LuGraduationCap, LuStar, LuUser } from 'react-icons/lu';
import { Button, Card } from '@hireevo/ui-web';
import { FormMessage } from '@/features/auth/form-message.tsx';
import { useSession } from '@/features/auth/session.tsx';
import {
  EDUCATION_FIELDS,
  EXPERIENCE_FIELDS,
  LICENSE_FIELDS,
  OPEN_ENDED,
  SKILL_FIELDS,
  normaliseSkill,
} from '@/features/profile-setup/entries-validation.ts';
import { useEntries } from '@/features/profile-setup/use-entries.ts';
import { useProfileDraft } from '@/features/profile-setup/use-profile-draft.ts';
import { displayNameOf } from '@/features/workspace/snapshot.ts';
import { AddButton } from './add-button.tsx';
import { entriesFrom, readDraft, writeDraft, type DraftContents } from './client-profile-draft.ts';
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
 * The design shows one language already on the profile, and the completion
 * counting it as the first of five key steps. It is the account's own language
 * rather than something the person added, which is why it is here and not in
 * `EMPTY_DRAFT` — an empty draft is empty.
 */
const STARTING_DRAFT: ProfileDraft = {
  ...EMPTY_DRAFT,
  country: 'Pakistan',
  languages: [{ name: 'English', proficiency: 'Conversational' }],
};

/** Which section is open. One at a time: two long forms at once is a page nobody reads. */
type OpenSection = 'about' | 'skills' | 'experience' | 'education' | 'certifications' | null;

/** Said under a section the profile API has no fields for. */
const NOT_CONNECTED =
  'Your profile cannot store this section yet, so it is kept in this browser until it can.';

/** How long to wait after a keystroke before writing the draft to this browser. */
const DRAFT_DELAY = 400;

/**
 * The client profile: everything a buyer sees, and the way in to each part of it.
 *
 * Signing in lands here, and the form is filled in a section at a time with one
 * Save at the end of it — so nothing is sent while someone is still thinking.
 * What that Save sends is the About fields, which is all the profile API can
 * hold today; the rest waits for it.
 *
 * Nothing typed is lost in the meantime: every keystroke goes into a draft in
 * this browser, and opening the page again starts from it. That draft is this
 * browser only, which the page says rather than implying an account-wide save.
 *
 * Each section's editor is fetched when that section is opened rather than
 * shipped with the page: see section-editors.tsx.
 */
export function ProfileBuilder() {
  const { user } = useSession();
  const userId = user?.id ?? null;

  // Read once, before anything renders: the page opens on the draft rather than
  // flashing the server's answer and replacing it.
  const [stored] = useState<DraftContents | null>(() =>
    userId === null ? null : readDraft(userId),
  );

  const identity = useProfileDraft({
    autosave: false,
    ...(user === null ? {} : { fallbackDisplayName: displayNameOf(user) }),
    ...(stored === null ? {} : { restore: stored.identity }),
  });
  const skills = useEntries('skill', SKILL_FIELDS, {
    normalise: normaliseSkill,
    initial: entriesFrom(SKILL_FIELDS, stored?.skills),
  });
  const experience = useEntries('role', EXPERIENCE_FIELDS, {
    optional: OPEN_ENDED.experience,
    initial: entriesFrom(EXPERIENCE_FIELDS, stored?.experience),
  });
  const education = useEntries('institution', EDUCATION_FIELDS, {
    optional: OPEN_ENDED.education,
    initial: entriesFrom(EDUCATION_FIELDS, stored?.education),
  });
  const licenses = useEntries('license', LICENSE_FIELDS, {
    optional: OPEN_ENDED.licenses,
    initial: entriesFrom(LICENSE_FIELDS, stored?.licenses),
  });

  const [draft, setDraft] = useState<ProfileDraft>(() =>
    stored === null
      ? STARTING_DRAFT
      : {
          ...STARTING_DRAFT,
          country: stored.country,
          languages: stored.languages,
          records: { ...STARTING_DRAFT.records, portfolio: stored.portfolio },
        },
  );
  const [open, setOpen] = useState<OpenSection>(null);

  const values = identity.values;
  const entries = {
    skills: skills.items,
    experience: experience.items,
    education: education.items,
    licenses: licenses.items,
  };

  // Written a moment after the last keystroke rather than on every one, and
  // gathered inside the effect so what is written is what those changes say.
  useEffect(() => {
    if (userId === null) return;
    const id = setTimeout(() => {
      writeDraft(userId, {
        identity: values,
        country: draft.country,
        languages: draft.languages,
        skills: entries.skills,
        experience: entries.experience,
        education: entries.education,
        licenses: entries.licenses,
        portfolio: draft.records.portfolio,
      });
    }, DRAFT_DELAY);
    return () => clearTimeout(id);
  }, [
    userId,
    values,
    draft,
    entries.skills,
    entries.experience,
    entries.education,
    entries.licenses,
  ]);

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
    displayName: values.displayName,
    title: values.headline,
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

  const completion = completionOf({ ...headerDraft, about: values.overview, skills: namedSkills });

  const saveStatus = {
    saved: 'All changes saved',
    saving: 'Saving your changes…',
    unsaved: 'Not saved yet — kept in this browser',
    failed: identity.save.kind === 'failed' ? identity.save.message : '',
    conflict: identity.save.kind === 'conflict' ? identity.save.message : '',
  }[identity.save.kind];

  /** Opens a section, or closes it when it is the one already open. */
  const toggle = (section: Exclude<OpenSection, null>) =>
    setOpen((current) => (current === section ? null : section));

  const close = (
    <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(null)}>
      Close
    </Button>
  );

  const keptHere = <p className="mt-4 text-xs text-content-warning">{NOT_CONNECTED}</p>;

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

      <SectionCard
        title="About"
        description="Share some details about yourself, your expertise, and what you offer."
        icon={<LuUser />}
        action={
          open === 'about' ? (
            close
          ) : (
            <AddButton onClick={() => toggle('about')}>
              {values.overview === '' ? 'Add details' : 'Edit details'}
            </AddButton>
          )
        }
      >
        {open === 'about' ? (
          <IdentityEditor
            values={values}
            fieldErrors={identity.fieldErrors}
            onChange={identity.change}
          />
        ) : values.overview === '' ? undefined : (
          <p className="text-sm leading-[1.7] whitespace-pre-line text-content-muted">
            {values.overview}
          </p>
        )}
      </SectionCard>

      <SectionCard
        title="Skills and expertise"
        description="Attract relevant clients by sharing your strengths and abilities."
        icon={<LuStar />}
        action={
          open === 'skills' ? (
            close
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
            {keptHere}
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
            close
          ) : (
            <AddButton onClick={() => toggle('experience')}>Add work experience</AddButton>
          )
        }
      >
        {open === 'experience' ? (
          <>
            <ExperienceEditor experience={experience} />
            {keptHere}
          </>
        ) : undefined}
      </SectionCard>

      {/* The only pair the design puts side by side, and only from `lg` — below
          that the column is too narrow for two of these to hold their shape. */}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-2">
        <SectionCard
          title="Education"
          optional
          description="Back up your skills by adding any educational degrees or programs."
          icon={<LuGraduationCap />}
          className={open === 'education' ? 'lg:col-span-2' : ''}
          action={
            open === 'education' ? (
              close
            ) : (
              <AddButton onClick={() => toggle('education')}>Add education</AddButton>
            )
          }
        >
          {open === 'education' ? (
            <>
              <EducationEditor education={education} />
              {keptHere}
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
              close
            ) : (
              <AddButton onClick={() => toggle('certifications')}>Add certifications</AddButton>
            )
          }
        >
          {open === 'certifications' ? (
            <>
              <LicenseEditor licenses={licenses} />
              {keptHere}
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

      {/* One save, at the end of the form, for the whole of it. */}
      <Card className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p role="status" aria-live="polite" className="text-sm font-medium text-content">
            {saveStatus}
          </p>
          <p className="mt-1 text-xs text-content-subtle">
            Everything you type is kept in this browser as you go. Saving sends your name, headline,
            biography and availability to your profile; the other sections wait until it can hold
            them.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => void identity.flush()}
          loading={identity.save.kind === 'saving'}
          loadingLabel="Saving"
          className="h-10 shrink-0 rounded-lg px-6 text-sm font-semibold"
        >
          Save
        </Button>
      </Card>
    </div>
  );
}
