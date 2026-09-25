'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  LuAward,
  LuBriefcaseBusiness,
  LuCircleDollarSign,
  LuClock,
  LuGraduationCap,
  LuPhone,
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
  CONTACT_FIELDS,
  RATE_CURRENCY,
  publishProfile,
  ratesOf,
  type RateValue,
} from '@/features/profile-setup/api.ts';
import { profileChanged } from '@/features/profile-setup/profile-events.ts';
import {
  RATE_PERIOD_LABEL,
  countryByCode,
  countryByName,
  formatRate,
  toMinorUnits,
} from '@/features/profile-setup/location-options.ts';
import { fromSavedSections, toSectionsPayload } from '@/features/profile-setup/sections-payload.ts';
import { PROFICIENCIES as SKILL_PROFICIENCIES } from '@/features/profile-setup/skill-options.ts';
import { useEntries } from '@/features/profile-setup/use-entries.ts';
import { useProfileDraft } from '@/features/profile-setup/use-profile-draft.ts';
import { ProfileStrengthCard } from '@/features/workspace/profile-strength-card.tsx';
import { displayNameOf } from '@/features/workspace/snapshot.ts';
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
import {
  labelOfProjectLength,
  labelOfRemoteMode,
  labelOfResponseTime,
} from './working-preferences-editor.tsx';
import { ProfileHeaderCard } from './profile-header-card.tsx';
import { LanguagesSection } from './languages-section.tsx';
import { FileThumbnails } from '@/features/media/attachments.tsx';
import { uploadsInFlight, watchUploads } from '@/features/media/upload.ts';
import { PortfolioSection } from './portfolio-section.tsx';
import { useContactValues } from '@/features/profile-setup/use-contact-values.ts';
import { SectionCard } from './section-card.tsx';
import {
  ContactEditor,
  EducationEditor,
  ExperienceEditor,
  IdentityEditor,
  LicenseEditor,
  RatesEditor,
  SkillsEditor,
  WorkingPreferencesEditor,
  VideoIntroEditor,
  VisibilityEditor,
} from './section-editors.tsx';
import { ContactSummary, SkillChips, SummaryList, joined, rangeOf } from './section-summaries.tsx';

/** Which section is open. One at a time: two long forms at once is a page nobody reads. */
type OpenSection =
  | 'contact'
  | 'about'
  | 'skills'
  | 'experience'
  | 'education'
  | 'certifications'
  | 'languages'
  | 'portfolio'
  | 'video'
  | 'visibility'
  | 'rates'
  | 'preferences'
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
  /**
   * The prices, one per period quoted.
   *
   * Beside the draft rather than inside it, because they are saved the way the
   * lists are — sent whole with the next save — and because what the browser
   * kept is newer than what the server holds.
   */
  const [rates, setRates] = useState<RateValue[]>(stored?.rates ?? []);
  const [open, setOpen] = useState<OpenSection>(null);
  const contact = useContactValues();
  /** Turned on by "Complete your profile": every filled section grows a pencil. */
  const [editMode, setEditMode] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  const languages = draft.languages;
  const portfolio = draft.records.portfolio;

  /**
   * Whether anything is still on its way to storage.
   *
   * A save sends every list whole, so one pressed mid-upload sends the piece
   * without the files still going up — and clears the ones already stored,
   * because a list is written whole. Saving waits for them instead, and says
   * so rather than looking broken.
   */
  const uploading = useSyncExternalStore(
    watchUploads,
    () => uploadsInFlight() > 0,
    () => false,
  );

  const collect = useCallback(
    () =>
      toSectionsPayload({
        languages: languages.map((language) => ({
          fields: { name: language.name, proficiency: language.proficiency },
          starred: language.starred,
        })),
        skills: skills.items.map((item) => item.values),
        experience: experience.items.map((item) => item.values),
        education: education.items.map((item) => item.values),
        licenses: licenses.items.map((item) => ({
          fields: item.values,
          files: item.files ?? [],
        })),
        portfolio: portfolio.map((record) => ({
          fields: record.fields,
          files: record.files ?? [],
        })),
      }),
    [languages, portfolio, skills.items, experience.items, education.items, licenses.items],
  );

  const collectRates = useCallback(() => rates, [rates]);

  const identity = useProfileDraft({
    autosave: false,
    collect,
    collectRates,
    collectContact: contact.collect,
    ...(user === null ? {} : { fallbackDisplayName: displayNameOf(user) }),
    ...(stored === null ? {} : { restore: stored.identity }),
  });

  const values = identity.values;

  // Filled in when the profile arrives, and only then: a save returns a new
  // profile object every time, and re-seeding on one would throw away whatever
  // had been typed while the request was out.
  useEffect(() => {
    contact.seed(identity.profile);
  }, [contact, identity.profile]);

  // The profile arrives after the page has rendered. Where this browser holds a
  // draft it is the later of the two and is left alone; otherwise the sections
  // are filled in from what was saved, which counts as saved rather than as
  // work to send straight back.
  const stage = useRef<'waiting' | 'filling' | 'editing'>(stored === null ? 'waiting' : 'editing');
  // A draft from this browser is already in the sections, so there is nothing to
  // wait for; otherwise the page waits for the server's lists to be put there.
  const [seeded, setSeeded] = useState(stored !== null);
  const sent = useRef('');
  /** Whether the draft this browser opened on has been measured against the server yet. */
  const judged = useRef(stored === null);
  const { profile, rebaseline, touch } = identity;

  useEffect(() => {
    if (profile === null) return;

    /*
     * A draft is only newer than the server while the server has not moved on.
     *
     * This page used to prefer whatever this browser kept, for ever and without
     * asking. A draft written before ten portfolio images were attached then
     * showed a piece with none of them — the files were in Postgres and in
     * storage the whole time — and the next save would have cleared them, since
     * every list is written whole. Comparing the version the draft was written
     * against with the version the server answers with tells the two apart.
     * When they disagree the draft is dropped and the page opened again on what
     * was saved: a fresh load rather than unpicking it in place, because the
     * fields were filled in from that draft before this ran, and reloading is
     * the one path that is certainly consistent.
     */
    if (!judged.current) {
      judged.current = true;
      if (stored !== null && stored.profileVersion !== profile.version) {
        if (userId !== null) clearDraft(userId);
        window.location.reload();
        return;
      }
    }

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
      setRates(ratesOf(profile));
      setDraft((current) => ({
        ...current,
        avatarUrl: profile.avatarUrl,
        country: countryByCode(profile.locationCountry)?.name ?? '',
        languages: saved.languages.map((language) => ({
          name: language.name,
          proficiency: asProficiency(language.proficiency),
          starred: language.starred,
        })),
        records: {
          ...current.records,
          portfolio: saved.portfolio.map((piece, index) => ({
            id: `portfolio-${index}`,
            fields: { title: piece.title, url: piece.url, summary: piece.summary },
            // Already stored, and claimed again by the next save: the editor
            // sends the whole list back every time, so a file left out is a
            // file removed.
            files: piece.files,
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
    // Nothing is kept before the profile has arrived: a draft that cannot say
    // which version it is newer than is one the next visit has to throw away.
    if (userId === null || profile === null) return;
    const id = setTimeout(() => {
      writeDraft(userId, {
        // What this draft is newer than.
        profileVersion: profile.version,
        identity: values,
        country: draft.country,
        languages: draft.languages,
        skills: entries.skills,
        experience: entries.experience,
        education: entries.education,
        licenses: entries.licenses,
        portfolio: draft.records.portfolio,
        rates,
      });
    }, DRAFT_DELAY);
    return () => clearTimeout(id);
  }, [
    userId,
    profile,
    values,
    draft,
    rates,
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

  /**
   * The header card edits the same name, headline and country the profile
   * holds — and shows the photo the profile holds.
   *
   * The photo is read from the profile here rather than from the draft, because
   * the draft cannot carry it: what is in this browser is what was typed, and a
   * photo is shown from a `blob:` URL belonging to the tab that made it, which
   * points at nothing in the next one. The saved URL used to be read only while
   * filling the page in from the server, and that step is skipped whenever this
   * browser holds a draft — so a photo that saved correctly and showed while
   * the tab stayed open was gone the moment the page was opened again.
   *
   * A photo just chosen wins over the saved one: `avatarKey` is non-empty only
   * between choosing one and the save that claims it, and for that moment the
   * browser's own copy is the newer of the two.
   */
  const headerDraft: ProfileDraft = {
    ...draft,
    displayName: values.displayName,
    title: values.headline,
    avatarUrl: values.avatarKey === '' ? (profile?.avatarUrl ?? null) : draft.avatarUrl,
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
  /** The working preferences as they read on the card, in the design's order. */
  const preferenceSummary = [
    values.remoteMode === '' ? null : labelOfRemoteMode(values.remoteMode),
    values.projectLength === '' ? null : labelOfProjectLength(values.projectLength),
    values.responseTime === ''
      ? null
      : `Responds ${labelOfResponseTime(values.responseTime).toLowerCase()}`,
    values.availableFrom === '' ? null : `Available from ${values.availableFrom}`,
  ].filter((line) => line !== null);

  /** Each price as it reads on the card: "$85.00 per hour". */
  const rateSummary = rates.flatMap((rate) => {
    const minor = toMinorUnits(rate.amount, RATE_CURRENCY);
    const shown = minor === null ? null : formatRate(minor, RATE_CURRENCY);
    return shown === null ? [] : [`${shown} ${RATE_PERIOD_LABEL[rate.period] ?? rate.period}`];
  });

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

  // Its own boolean rather than a row in `filled`: that map feeds the strength
  // figure, which mirrors the API's weights, and the API does not count contact
  // detail towards completeness. Adding it here would make the two disagree.
  const contactFilled = CONTACT_FIELDS.some((field) => contact.values[field].trim() !== '');

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

  /**
   * Takes a finished profile public.
   *
   * Saves what is on screen first, so publishing never lags behind an edit, then
   * adopts the published copy and announces it — which is what turns the seller
   * bar's availability on, since a profile can only be available once it is live.
   */
  async function publish() {
    setPublishError(null);
    setPublishing(true);
    const flushed = await identity.flush();
    if (!flushed) {
      setPublishing(false);
      setPublishError('Your latest changes could not be saved, so nothing was published.');
      return;
    }
    const result = await publishProfile();
    setPublishing(false);
    if (result.ok) {
      if (userId !== null) clearDraft(userId);
      identity.adopt(result.profile);
      profileChanged(result.profile);
      return;
    }
    setPublishError(
      result.kind === 'incomplete'
        ? 'Some sections still need attention before your profile can go public.'
        : result.message,
    );
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
   * The control in a section's corner.
   *
   * Nothing at all until "Complete your profile" turns editing on. Landing here
   * shows the profile as it stands, which is what somebody wants to see first;
   * a page that opens covered in controls reads as a form to fill in rather
   * than as the thing being filled in.
   *
   * From then every section carries the same pencil — the ones holding
   * something and the ones still empty alike — so there is one way in to learn
   * rather than one per state.
   */
  function actionFor(section: Exclude<OpenSection, null>, name: string) {
    if (open === section) return close;
    return editMode ? <EditButton section={name} onClick={() => toggle(section)} /> : null;
  }

  return (
    // Two columns, as the design draws them: the profile itself on the left —
    // its header and every section — and the strength card alone on the right,
    // beside all of it rather than above the sections.
    //
    // `minmax(0,1fr)` on the single-column track too: a grid track sized `auto`
    // takes its content’s minimum width, which pushed these cards wider than a
    // 320px screen.
    //
    // 908 + 48 + 338 = 1294, the three numbers the design draws. The sidebar is
    // a fixed width rather than a fraction: it holds one card of a known size,
    // and letting it stretch is what made it disagree with the frame.
    <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-5 lg:grid-cols-[minmax(0,1fr)_338px] lg:gap-12">
      <ProfileHeaderCard
        draft={headerDraft}
        username={user?.username ?? null}
        published={identity.profile?.status === 'published'}
        slug={identity.profile?.slug ?? null}
        editable={editMode}
        onChange={patchHeader}
      />

      {/* After the header in the markup, so a phone meets the profile before
          the summary of it, and beside both rows from `lg`. */}
      <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
        <ProfileStrengthCard
          compact
          strength={{
            percent: completion.percent,
            done: completion.done,
            total: completion.total,
            label: completion.label,
            headline: completion.headline,
            items: completion.items,
            // Editing and publishing are two buttons now, not one that changed
            // its mind. Publishing used to replace the edit button once the
            // profile reached a hundred per cent, which left a finished profile
            // with no way back into editing — so the moment someone filled in
            // their last section was the moment they could no longer change any
            // of it.
            action: editMode
              ? {
                  label: 'Done editing',
                  onClick: () => {
                    setEditMode(false);
                    setOpen(null);
                  },
                }
              : {
                  label: completion.percent === 100 ? 'Edit profile' : 'Complete your profile',
                  onClick: () => setEditMode(true),
                },
            // Always offered, at any percentage. What may actually be published
            // is the API's rule rather than this card's, and it answers with the
            // fields that are missing — which is a better thing to read than a
            // button that is simply not there.
            // Publishing saves first, so it is shut while files are still
            // going up for the same reason Save is: a save sent then would
            // publish a profile with the pieces missing their images.
            secondaryAction: {
              label: uploading ? 'Uploading…' : publishing ? 'Publishing…' : 'Publish',
              onClick: () => void publish(),
              disabled: uploading,
            },
          }}
        />
        {publishError === null ? null : (
          <p role="alert" className="mt-2 text-sm text-content-warning">
            {publishError}
          </p>
        )}
      </div>

      <div className="flex min-w-0 flex-col gap-5 lg:col-start-1">
        {/* Above About, where the design puts it, and never on the published
            page: these go to the profile's private row, which the public
            serializer is never given. The card says so, because a form asking
            for two phone numbers should say where they end up. */}
        <SectionCard
          title="Contact Details"
          description="How clients reach you once you agree to talk. Kept private — never shown on your public profile."
          filled={contactFilled}
          icon={<LuPhone />}
          editing={open === 'contact'}
          action={actionFor('contact', 'contact details')}
        >
          {open === 'contact' ? (
            <ContactEditor
              values={contact.values}
              fieldErrors={identity.fieldErrors}
              onChange={contact.change}
            />
          ) : contactFilled ? (
            <ContactSummary values={contact.values} />
          ) : undefined}
        </SectionCard>

        <SectionCard
          title="About"
          description="Share some details about yourself, your expertise, and what you offer."
          filled={filled.about}
          icon={<LuUser />}
          editing={open === 'about'}
          action={actionFor('about', 'About')}
        >
          {open === 'about' ? (
            <IdentityEditor
              values={values}
              fieldErrors={identity.fieldErrors}
              onChange={identity.change}
            />
          ) : filled.about ? (
            <p className="text-sm leading-[1.7] wrap-anywhere whitespace-pre-line text-content-muted">
              {values.overview}
            </p>
          ) : undefined}
        </SectionCard>

        <SectionCard
          title="Skills and expertise"
          description="Attract relevant clients by sharing your strengths and abilities."
          filled={filled.skills}
          icon={<LuStar />}
          editing={open === 'skills'}
          action={actionFor('skills', 'skills and expertise')}
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
          filled={filled.experience}
          icon={<LuBriefcaseBusiness />}
          editing={open === 'experience'}
          action={actionFor('experience', 'work experience')}
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
            filled={filled.education}
            icon={<LuGraduationCap />}
            className={open === 'education' ? 'lg:col-span-2' : ''}
            editing={open === 'education'}
            action={actionFor('education', 'education')}
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
            filled={filled.certifications}
            icon={<LuAward />}
            className={open === 'certifications' ? 'lg:col-span-2' : ''}
            editing={open === 'certifications'}
            action={actionFor('certifications', 'certifications')}
          >
            {open === 'certifications' ? (
              <LicenseEditor licenses={licenses} heading={false} />
            ) : filled.certifications ? (
              <SummaryList
                rows={certificates.map((item) => ({
                  key: item.key,
                  primary: item.values.name,
                  secondary: joined(item.values.issuer, rangeOf(item.values.issued, '')),
                  media: <FileThumbnails files={item.files ?? []} />,
                }))}
              />
            ) : undefined}
          </SectionCard>
        </div>

        <LanguagesSection
          open={open === 'languages'}
          action={actionFor('languages', 'languages')}
          languages={draft.languages}
          onChange={(languages) => setDraft((current) => ({ ...current, languages }))}
        />

        <PortfolioSection
          open={open === 'portfolio'}
          action={actionFor('portfolio', 'portfolio')}
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
          filled={filled.videoIntro}
          icon={<LuVideo />}
          editing={open === 'video'}
          action={actionFor('video', 'video intro')}
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
          filled
          icon={<LuShieldCheck />}
          editing={open === 'visibility'}
          action={actionFor('visibility', 'visibility')}
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
          title="Working preferences"
          description="How you like to work, for a buyer deciding whether to write."
          filled={preferenceSummary.length > 0}
          icon={<LuClock />}
          editing={open === 'preferences'}
          action={actionFor('preferences', 'working preferences')}
        >
          {open === 'preferences' ? (
            <WorkingPreferencesEditor
              values={values}
              fieldErrors={identity.fieldErrors}
              onChange={identity.change}
            />
          ) : (
            <p className="text-sm text-content-muted">
              {preferenceSummary.length === 0
                ? 'No working preferences set yet.'
                : preferenceSummary.join(' · ')}
            </p>
          )}
        </SectionCard>

        <SectionCard
          title="Expected rates"
          description="Set a price for each period you quote for. Buyers see only the ones you fill in."
          filled={rateSummary.length > 0}
          icon={<LuCircleDollarSign />}
          editing={open === 'rates'}
          action={actionFor('rates', 'expected rates')}
        >
          {open === 'rates' ? (
            <RatesEditor
              rates={rates}
              onChange={(next) => {
                setRates(next);
                identity.touch();
              }}
            />
          ) : (
            <p className="text-sm text-content-muted">
              {rateSummary.length === 0 ? 'No rates set yet.' : rateSummary.join(' · ')}
            </p>
          )}
        </SectionCard>

        {/* One save, at the end of the form, for the whole of it — and only
            while there is a form. On the page as it is landed on, nothing can
            be typed, so a Save button offers to write changes that cannot
            exist. */}
        {!editMode ? null : (
          <Card className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p role="status" aria-live="polite" className="text-sm font-medium text-content">
                {uploading ? 'Waiting for your files to finish uploading…' : saveStatus}
              </p>
              <p className="mt-1 text-xs text-content-subtle">
                Everything you type is kept in this browser until you save, so nothing is lost if
                you close the page. Saving sends the whole profile — your details and every section.
              </p>
            </div>
            <Button
              type="button"
              onClick={() => void save()}
              loading={identity.save.kind === 'saving'}
              loadingLabel="Saving"
              disabled={uploading}
              className="h-10 shrink-0 rounded-lg px-6 text-sm font-semibold"
            >
              {uploading ? 'Uploading…' : 'Save'}
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}
