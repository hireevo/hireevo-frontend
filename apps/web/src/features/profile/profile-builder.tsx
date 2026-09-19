'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  LuAward,
  LuBriefcaseBusiness,
  LuCircleDollarSign,
  LuGraduationCap,
  LuShieldCheck,
  LuStar,
  LuUser,
  LuVideo,
} from 'react-icons/lu';
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
import {
  countryByCode,
  countryByName,
  formatRate,
} from '@/features/profile-setup/location-options.ts';
import { fromSavedSections, toSectionsPayload } from '@/features/profile-setup/sections-payload.ts';
import { PROFICIENCIES as SKILL_PROFICIENCIES } from '@/features/profile-setup/skill-options.ts';
import { useEntries } from '@/features/profile-setup/use-entries.ts';
import { useProfileDraft } from '@/features/profile-setup/use-profile-draft.ts';
import { ProfileStrengthCard } from '@/features/workspace/profile-strength-card.tsx';
import { displayNameOf } from '@/features/workspace/snapshot.ts';
import { AddButton } from './add-button.tsx';
import {
  clearDraft,
  entriesFrom,
  readDraft,
  writeDraft,
  type DraftContents,
} from './client-profile-draft.ts';
import {
  EMPTY_DRAFT,
  PROFICIENCIES,
  completionOf,
  type ProfileDraft,
  type Proficiency,
  type SectionsFilled,
} from './draft.ts';
import { EditButton } from './edit-button.tsx';
import { ProfileHeaderCard } from './profile-header-card.tsx';
import { RecordSection } from './record-section.tsx';
import { RECORD_SPECS } from './record-specs.tsx';
import { SectionCard } from './section-card.tsx';
import {
  EducationEditor,
  ExperienceEditor,
  IdentityEditor,
  LicenseEditor,
  RatesEditor,
  SkillsEditor,
  VideoIntroEditor,
  VisibilityEditor,
} from './section-editors.tsx';
import { SkillChips, SummaryList, joined, rangeOf } from './section-summaries.tsx';

/** Which section is open. One at a time: two long forms at once is a page nobody reads. */
type OpenSection =
  | 'about'
  | 'skills'
  | 'experience'
  | 'education'
  | 'certifications'
  | 'portfolio'
  | 'video'
  | 'visibility'
  | 'rates'
  | null;

/** How long to wait after a keystroke before writing the draft to this browser. */
const DRAFT_DELAY = 400;

/** A stored language level as one of the ones offered, or the mildest if it is none. */
const asProficiency = (value: string): Proficiency =>
  PROFICIENCIES.find((level) => level === value) ?? PROFICIENCIES[0];

/**
 * The client profile: everything a buyer sees, and the way in to each part of it.
 *
 * Signing in lands here. The page reads as the profile itself rather than as a
 * form: a section that has something in it shows it, and the pencil that opens
 * it appears only once "Complete your profile" turns editing on. A section that
 * is still empty always offers its way in, because there is nothing to read
 * there yet.
 *
 * Everything except visibility is saved by the one button at the foot of the
 * page, in the single request the profile API takes. Nothing typed is lost in
 * the meantime: every keystroke goes into a draft in this browser, cleared once
 * the save it was protecting lands.
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
      ? EMPTY_DRAFT
      : {
          ...EMPTY_DRAFT,
          country: stored.country,
          languages: stored.languages,
          records: { ...EMPTY_DRAFT.records, portfolio: stored.portfolio },
        },
  );
  const [open, setOpen] = useState<OpenSection>(null);
  /** Turned on by "Complete your profile": every filled section grows a pencil. */
  const [editMode, setEditMode] = useState(false);

  const languages = draft.languages;
  const portfolio = draft.records.portfolio;

  const collect = useCallback(
    () =>
      toSectionsPayload({
        languages: languages.map((language) => ({
          name: language.name,
          proficiency: language.proficiency,
        })),
        skills: skills.items.map((item) => item.values),
        experience: experience.items.map((item) => item.values),
        education: education.items.map((item) => item.values),
        licenses: licenses.items.map((item) => item.values),
        portfolio: portfolio.map((record) => record.fields),
      }),
    [languages, portfolio, skills.items, experience.items, education.items, licenses.items],
  );

  const identity = useProfileDraft({
    autosave: false,
    collect,
    ...(user === null ? {} : { fallbackDisplayName: displayNameOf(user) }),
    ...(stored === null ? {} : { restore: stored.identity }),
  });

  const values = identity.values;

  // The profile arrives after the page has rendered. Where this browser holds a
  // draft it is the later of the two and is left alone; otherwise the sections
  // are filled in from what was saved, which counts as saved rather than as
  // work to send straight back.
  const stage = useRef<'waiting' | 'filling' | 'editing'>(stored === null ? 'waiting' : 'editing');
  // A draft from this browser is already in the sections, so there is nothing to
  // wait for; otherwise the page waits for the server's lists to be put there.
  const [seeded, setSeeded] = useState(stored !== null);
  const sent = useRef('');
  const { profile, rebaseline, touch } = identity;
  useEffect(() => {
    if (profile === null) return;

    if (stage.current === 'waiting') {
      stage.current = 'filling';
      const saved = fromSavedSections(profile.sections, {
        languages: PROFICIENCIES,
        skills: SKILL_PROFICIENCIES,
      });
      skills.reset(saved.skills);
      experience.reset(saved.experience);
      education.reset(saved.education);
      licenses.reset(saved.licenses);
      setDraft((current) => ({
        ...current,
        avatarUrl: profile.avatarUrl,
        country: countryByCode(profile.locationCountry)?.name ?? '',
        languages: saved.languages.map((language) => ({
          name: language.name,
          proficiency: asProficiency(language.proficiency),
        })),
        records: {
          ...current.records,
          portfolio: saved.portfolio.map((piece, index) => ({
            id: `portfolio-${index}`,
            fields: { title: piece.title, url: piece.url, summary: piece.summary },
          })),
        },
      }));
      setSeeded(true);
      return;
    }

    if (stage.current === 'filling') {
      stage.current = 'editing';
      sent.current = JSON.stringify(collect());
      rebaseline();
      return;
    }

    const now = JSON.stringify(collect());
    if (now === sent.current) return;
    sent.current = now;
    touch();
    // The lists themselves are what this watches; `collect` changes with them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, collect, rebaseline, touch]);

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

  // Still loading until the lists are in their sections, not just until the
  // profile has arrived. Showing the sections a moment early means showing them
  // empty and then replacing them, and anything typed into that first moment is
  // typed into fields that are about to be thrown away.
  if (identity.load.status === 'loading' || !seeded) {
    return (
      <p role="status" className="text-sm text-content-subtle">
        Loading your profile…
      </p>
    );
  }

  /** The header card edits the same name, headline and country the profile holds. */
  const headerDraft: ProfileDraft = {
    ...draft,
    displayName: values.displayName,
    title: values.headline,
  };

  function patchHeader(patch: Partial<ProfileDraft>) {
    const { displayName, title, avatarKey, country, ...rest } = patch;
    if (displayName !== undefined) identity.change('displayName', displayName);
    if (title !== undefined) identity.change('headline', title);
    if (avatarKey !== undefined) identity.change('avatarKey', avatarKey);
    if (country !== undefined) {
      // The field takes a country's name; the profile stores its code. A name
      // that is not one of them clears the code rather than saving something
      // the API would refuse — and the name stays on screen to be corrected.
      identity.change('locationCountry', countryByName(country)?.code ?? '');
      setDraft((current) => ({ ...current, country }));
    }
    if (Object.keys(rest).length > 0) setDraft((current) => ({ ...current, ...rest }));
  }

  const namedSkills = skills.items
    .map((item) => item.values.name.trim())
    .filter((name) => name !== '');
  const roles = experience.items.filter((item) => item.values.role.trim() !== '');
  const courses = education.items.filter((item) => item.values.institution.trim() !== '');
  const certificates = licenses.items.filter((item) => item.values.name.trim() !== '');
  const rate = formatRate(values.rateAmountMinor, values.rateCurrency);

  const filled: SectionsFilled = {
    about: values.overview.trim() !== '',
    skills: namedSkills.length > 0,
    experience: roles.length > 0,
    education: courses.length > 0,
    certifications: certificates.length > 0,
    portfolio: draft.records.portfolio.length > 0,
    videoIntro: values.videoIntroUrl.trim() !== '',
  };
  const completion = completionOf(filled);

  const saveStatus = {
    saved: 'All changes saved',
    saving: 'Saving your changes…',
    unsaved: 'Not saved yet',
    failed: identity.save.kind === 'failed' ? identity.save.message : '',
    conflict: identity.save.kind === 'conflict' ? identity.save.message : '',
  }[identity.save.kind];

  /** Saves the whole profile, and lets go of the draft that was protecting it. */
  async function save() {
    if ((await identity.flush()) && userId !== null) clearDraft(userId);
  }

  /** Opens a section, or closes it when it is the one already open. */
  const toggle = (section: Exclude<OpenSection, null>) =>
    setOpen((current) => (current === section ? null : section));

  const close = (
    <Button type="button" size="sm" variant="secondary" onClick={() => setOpen(null)}>
      Close
    </Button>
  );

  /**
   * The control in a section's corner: a way in while it is empty, a pencil once
   * it holds something and editing is on, and nothing at all otherwise.
   */
  function actionFor(
    section: Exclude<OpenSection, null>,
    done: boolean,
    addLabel: string,
    name: string,
  ) {
    if (open === section) return close;
    if (!done) return <AddButton onClick={() => toggle(section)}>{addLabel}</AddButton>;
    return editMode ? <EditButton section={name} onClick={() => toggle(section)} /> : null;
  }

  return (
    <div className="flex flex-col gap-5">
      {/* `minmax(0,1fr)` on the single-column track too: a grid track sized
          `auto` takes its content’s minimum width, which pushed these cards
          wider than a 320px screen. */}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:items-start">
        <ProfileHeaderCard
          draft={headerDraft}
          username={user?.username ?? null}
          slug={identity.profile?.status === 'published' ? identity.profile.slug : null}
          onChange={patchHeader}
        />
        <ProfileStrengthCard
          strength={{
            percent: completion.percent,
            done: completion.done,
            total: completion.total,
            label: completion.label,
            headline: completion.headline,
            items: completion.items,
            action: editMode
              ? {
                  label: 'Done editing',
                  onClick: () => {
                    setEditMode(false);
                    setOpen(null);
                  },
                }
              : { label: 'Complete your profile', onClick: () => setEditMode(true) },
          }}
        />
      </div>

      <SectionCard
        title="About"
        description="Share some details about yourself, your expertise, and what you offer."
        icon={<LuUser />}
        editing={open === 'about'}
        action={actionFor('about', filled.about, 'Add details', 'About')}
      >
        {open === 'about' ? (
          <IdentityEditor
            values={values}
            fieldErrors={identity.fieldErrors}
            onChange={identity.change}
          />
        ) : filled.about ? (
          <p className="text-sm leading-[1.7] whitespace-pre-line text-content-muted">
            {values.overview}
          </p>
        ) : undefined}
      </SectionCard>

      <SectionCard
        title="Skills and expertise"
        description="Attract relevant clients by sharing your strengths and abilities."
        icon={<LuStar />}
        editing={open === 'skills'}
        action={actionFor(
          'skills',
          filled.skills,
          'Add skills and expertise',
          'skills and expertise',
        )}
      >
        {open === 'skills' ? (
          <SkillsEditor skills={skills} heading={false} />
        ) : filled.skills ? (
          <SkillChips names={namedSkills} />
        ) : undefined}
      </SectionCard>

      <SectionCard
        title="Work experience"
        optional
        description="Add your job history and achievements to give clients insight into your expertise."
        icon={<LuBriefcaseBusiness />}
        editing={open === 'experience'}
        action={actionFor(
          'experience',
          filled.experience,
          'Add work experience',
          'work experience',
        )}
      >
        {open === 'experience' ? (
          <ExperienceEditor experience={experience} heading={false} />
        ) : filled.experience ? (
          <SummaryList
            rows={roles.map((item) => ({
              key: item.key,
              primary: item.values.role,
              secondary: joined(
                item.values.organization,
                rangeOf(item.values.startDate, item.values.endDate),
              ),
              body: item.values.summary,
            }))}
          />
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
          editing={open === 'education'}
          action={actionFor('education', filled.education, 'Add education', 'education')}
        >
          {open === 'education' ? (
            <EducationEditor education={education} heading={false} />
          ) : filled.education ? (
            <SummaryList
              rows={courses.map((item) => ({
                key: item.key,
                primary: item.values.institution,
                secondary: joined(
                  item.values.qualification,
                  item.values.fieldOfStudy,
                  rangeOf(item.values.startDate, item.values.endDate),
                ),
              }))}
            />
          ) : undefined}
        </SectionCard>

        <SectionCard
          title="Certifications"
          optional
          description="Showcase your mastery with certifications earned in your field."
          icon={<LuAward />}
          className={open === 'certifications' ? 'lg:col-span-2' : ''}
          editing={open === 'certifications'}
          action={actionFor(
            'certifications',
            filled.certifications,
            'Add certifications',
            'certifications',
          )}
        >
          {open === 'certifications' ? (
            <LicenseEditor licenses={licenses} heading={false} />
          ) : filled.certifications ? (
            <SummaryList
              rows={certificates.map((item) => ({
                key: item.key,
                primary: item.values.name,
                secondary: joined(item.values.issuer, rangeOf(item.values.issued, '')),
              }))}
            />
          ) : undefined}
        </SectionCard>
      </div>

      {/* Portfolio has no designed editor yet, so it keeps the short record form. */}
      <RecordSection
        spec={RECORD_SPECS.portfolio}
        open={open === 'portfolio'}
        action={actionFor('portfolio', filled.portfolio, 'Add portfolio', 'portfolio')}
        records={draft.records.portfolio}
        onChange={(records) =>
          setDraft((current) => ({
            ...current,
            records: { ...current.records, portfolio: records },
          }))
        }
      />

      <SectionCard
        title="Video intro"
        optional
        description="Record a short video to introduce yourself and make a great first impression."
        icon={<LuVideo />}
        editing={open === 'video'}
        action={actionFor('video', filled.videoIntro, 'Add video intro', 'video intro')}
      >
        {open === 'video' ? (
          <VideoIntroEditor
            url={values.videoIntroUrl}
            fieldErrors={identity.fieldErrors}
            onChange={(url) => identity.change('videoIntroUrl', url)}
          />
        ) : filled.videoIntro ? (
          <p className="truncate text-sm text-content-muted">{values.videoIntroUrl}</p>
        ) : undefined}
      </SectionCard>

      <SectionCard
        title="Visibility"
        description="Control who can see your profile and manage your online presence."
        icon={<LuShieldCheck />}
        editing={open === 'visibility'}
        action={
          open === 'visibility' ? (
            close
          ) : (
            <AddButton onClick={() => toggle('visibility')}>Manage visibility</AddButton>
          )
        }
      >
        {open === 'visibility' ? (
          <VisibilityEditor draft={identity} />
        ) : (
          <p className="text-sm text-content-muted">
            {identity.profile?.visibility.profilePublic === true
              ? 'Public once published, showing only the sections you chose.'
              : 'Private. Nothing is shown publicly until you choose to publish.'}
          </p>
        )}
      </SectionCard>

      <SectionCard
        title="Expected rates"
        description="Set the hourly rate buyers see, in the currency you bill in."
        icon={<LuCircleDollarSign />}
        editing={open === 'rates'}
        action={
          open === 'rates' ? (
            close
          ) : (
            <AddButton onClick={() => toggle('rates')}>Manage rates</AddButton>
          )
        }
      >
        {open === 'rates' ? (
          <RatesEditor
            values={values}
            fieldErrors={identity.fieldErrors}
            onChange={identity.change}
          />
        ) : (
          <p className="text-sm text-content-muted">
            {rate === null ? 'No rate set yet.' : `${rate} per hour`}
          </p>
        )}
      </SectionCard>

      {/* One save, at the end of the form, for the whole of it. */}
      <Card className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p role="status" aria-live="polite" className="text-sm font-medium text-content">
            {saveStatus}
          </p>
          <p className="mt-1 text-xs text-content-subtle">
            Everything you type is kept in this browser until you save, so nothing is lost if you
            close the page. Saving sends the whole profile — your details and every section.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => void save()}
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
