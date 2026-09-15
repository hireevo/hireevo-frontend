'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@hireevo/ui-web';
import { publishProfile, type OwnProfile } from './api.ts';
import { DraftStatusCard } from './draft-status-card.tsx';
import { EducationStep } from './education-step.tsx';
import {
  EDUCATION_FIELDS,
  EXPERIENCE_FIELDS,
  LANGUAGE_FIELDS,
  LICENSE_FIELDS,
  SKILL_FIELDS,
  normaliseSkill,
  todayIso,
  validateEducation,
  validateExperience,
  validateLanguages,
  validateLicenses,
  validateSkills,
} from './entries-validation.ts';
import { ExperienceStep } from './experience-step.tsx';
import { IdentityStep } from './identity-step.tsx';
import { LocationStep } from './location-step.tsx';
import { PUBLISH_SECTION_ID, PublishBanner, type PublishState } from './publish-banner.tsx';
import { SetupSidebar } from './setup-sidebar.tsx';
import { SkillsStep } from './skills-step.tsx';
import { FIELD_STEP, hrefFor, sectionIdFor, stepFor, type StepId } from './steps.ts';
import { useEntries, type EntryErrors } from './use-entries.ts';
import { useLocationDraft } from './use-location-draft.ts';
import { useProfileDraft } from './use-profile-draft.ts';
import { useSectionInView } from './use-section-in-view.ts';
import { useVisibilityDraft } from './use-visibility-draft.ts';
import { VisibilityStep } from './visibility-step.tsx';

/**
 * How many of the six sections the server holds a finished answer for. Read from
 * what was saved, never from what is typed, so the number cannot run ahead of
 * the data. Three sections have no API yet and cannot count.
 */
export function sectionsSavedIn(profile: OwnProfile | null): number {
  if (profile === null) return 0;
  const identity = identitySaved(profile);
  const location = profile.locationCountry !== null && profile.rateAmountMinor !== null;
  const visibility = profile.status === 'published';
  return [identity, location, visibility].filter(Boolean).length;
}

/** Whether every Identity and story field has a saved, non-blank value. */
export function identitySaved(profile: OwnProfile | null): boolean {
  return (
    profile !== null &&
    [profile.displayName, profile.headline, profile.overview, profile.availabilityNote].every(
      (value) => value !== null && value.trim() !== '',
    )
  );
}

/** The design's content is 1100px wide, so the column is that plus its padding. */
const MAIN = 'mx-auto w-full max-w-[1148px] px-4 py-6 sm:px-6 lg:py-8';

/** Shown while any section after the first holds anything, until the API can store it. */
export const LOCAL_NOT_SAVED =
  'Saved changes cover Identity and story. The other sections are not connected to your profile yet: they stay on this page and are lost on reload.';

/** Brings a section to the top of the window and, when asked, puts focus on its heading. */
function revealSection(id: StepId | 'publish', focus: boolean) {
  const section = document.getElementById(id === 'publish' ? PUBLISH_SECTION_ID : sectionIdFor(id));
  if (section === null) return;
  section.scrollIntoView({ block: 'start' });
  // Already in place: focusing must not scroll it again, past its scroll margin.
  if (focus) section.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true });
}

const anyProblems = (...found: EntryErrors[]) =>
  found.some((errors) => Object.keys(errors).length > 0);

/**
 * Profile setup: the six sections of the design on one page, with the step list
 * beside them following along.
 *
 * Identity and story autosaves to the profile API. The other sections are
 * complete on screen but kept in the page until the API gains their fields —
 * the draft card says so, and leaving the page with anything in them asks first.
 */
export function ProfileSetupScreen({ autosaveDelay }: { autosaveDelay?: number }) {
  const router = useRouter();
  const step = stepFor(useSearchParams().get('step'));
  const draft = useProfileDraft(autosaveDelay === undefined ? {} : { autosaveDelay });
  const [publish, setPublish] = useState<PublishState>({ kind: 'idle' });
  const location = useLocationDraft();
  const languages = useEntries('language', LANGUAGE_FIELDS);
  const skills = useEntries('skill', SKILL_FIELDS, normaliseSkill);
  const experience = useEntries('role', EXPERIENCE_FIELDS);
  const education = useEntries('institution', EDUCATION_FIELDS);
  const licenses = useEntries('license', LICENSE_FIELDS);
  const visibility = useVisibilityDraft();

  const loaded = draft.load.status !== 'loading' && draft.load.status !== 'error';
  const inView = useSectionInView(loaded);

  const unsavedElsewhere =
    location.dirty ||
    languages.dirty ||
    skills.dirty ||
    experience.dirty ||
    education.dirty ||
    licenses.dirty ||
    visibility.dirty;

  // `?step=` names the section to open at, or the one a link just asked for.
  const arrived = useRef(false);
  useEffect(() => {
    if (!loaded) return;
    const first = !arrived.current;
    arrived.current = true;
    // Arriving at the first section needs no scrolling, and taking focus while
    // the page loads would pull a screen reader away from where it starts.
    if (first && step.id === 'identity') return;
    revealSection(step.id, !first);
  }, [loaded, step.id]);

  useEffect(() => {
    if (!unsavedElsewhere) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [unsavedElsewhere]);

  if (draft.load.status === 'loading') {
    return (
      <main id="main-content" className={MAIN}>
        <p role="status" className="text-sm text-content-subtle">
          Loading your profile…
        </p>
      </main>
    );
  }

  if (draft.load.status === 'error') {
    return (
      <main id="main-content" className={MAIN}>
        <h1 className="text-xl font-semibold text-content">Your profile could not be loaded</h1>
        <p role="alert" className="mt-2 text-sm text-content-subtle">
          {draft.load.message}
        </p>
        <Button type="button" className="mt-4" onClick={() => void draft.reload()}>
          Try again
        </Button>
      </main>
    );
  }

  /** Moves on to a section, and records it in the URL so a reload returns there. */
  function goTo(id: StepId) {
    router.push(hrefFor(id), { scroll: false });
    revealSection(id, true);
  }

  async function identityNext() {
    if (await draft.flush()) goTo('location');
  }

  function locationNext(): boolean {
    if (Object.keys(location.checkAll()).length > 0) return false;
    goTo('skills');
    return true;
  }

  function skillsNext(): boolean {
    const languageErrors = validateLanguages(languages.items);
    const skillErrors = validateSkills(skills.items);
    languages.showErrors(languageErrors);
    skills.showErrors(skillErrors);
    if (anyProblems(languageErrors, skillErrors)) return false;
    goTo('experience');
    return true;
  }

  function experienceNext(): boolean {
    const found = validateExperience(experience.items, todayIso());
    experience.showErrors(found);
    if (anyProblems(found)) return false;
    goTo('education');
    return true;
  }

  function educationNext(): boolean {
    const educationErrors = validateEducation(education.items);
    const licenseErrors = validateLicenses(licenses.items, todayIso());
    education.showErrors(educationErrors);
    licenses.showErrors(licenseErrors);
    if (anyProblems(educationErrors, licenseErrors)) return false;
    goTo('visibility');
    return true;
  }

  function visibilitySave(): boolean {
    if (!visibility.save()) return false;
    revealSection('publish', true);
    return true;
  }

  const completed = new Set<StepId>();
  if (identitySaved(draft.profile)) completed.add('identity');
  if (location.complete) completed.add('location');
  if (languages.complete && skills.complete) completed.add('skills');
  if (experience.complete) completed.add('experience');
  if (
    education.items.length + licenses.items.length > 0 &&
    !education.incomplete &&
    !licenses.incomplete
  ) {
    completed.add('education');
  }
  if (visibility.saved) completed.add('visibility');

  async function handlePublish() {
    setPublish({ kind: 'publishing' });
    // Publish what is on screen, not what was saved a second ago.
    if (!(await draft.flush())) {
      setPublish({
        kind: 'failed',
        message: 'Your latest changes could not be saved, so nothing was published.',
      });
      return;
    }
    const result = await publishProfile();
    if (result.ok) {
      draft.adopt(result.profile);
      setPublish({ kind: 'idle' });
    } else if (result.kind === 'incomplete') {
      setPublish({
        kind: 'incomplete',
        issues: result.issues.map((issue) => ({
          message: issue.message,
          step: stepFor(FIELD_STEP[issue.field] ?? 'identity'),
        })),
      });
    } else {
      setPublish({ kind: 'failed', message: result.message });
    }
  }

  return (
    <main id="main-content" className={MAIN}>
      <h1 className="sr-only">Profile setup</h1>
      <div className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)] lg:items-start lg:gap-6">
        {/* Stays beside a long page — where the window is tall enough to show all of it. */}
        <div className="flex flex-col gap-4 lg:[@media(min-height:800px)]:sticky lg:[@media(min-height:800px)]:top-6">
          <SetupSidebar
            current={stepFor(inView ?? step.id)}
            completed={completed}
            onSelect={(id) => revealSection(id, true)}
          />
          <DraftStatusCard
            save={draft.save}
            sectionsSaved={sectionsSavedIn(draft.profile)}
            onRetry={() => void draft.flush()}
            onReload={() => void draft.reload()}
            notice={unsavedElsewhere ? LOCAL_NOT_SAVED : null}
          />
        </div>

        <div className="flex min-w-0 flex-col gap-5 lg:gap-6">
          <IdentityStep
            values={draft.values}
            fieldErrors={draft.fieldErrors}
            onChange={draft.change}
            onSaveAndNext={() => void identityNext()}
            saving={draft.save.kind === 'saving'}
          />
          <LocationStep
            values={location.values}
            errors={location.errors}
            onChange={location.change}
            onBlurField={location.settle}
            onSaveAndNext={locationNext}
          />
          <SkillsStep languages={languages} skills={skills} onSaveAndNext={skillsNext} />
          <ExperienceStep experience={experience} onSaveAndNext={experienceNext} />
          <EducationStep education={education} licenses={licenses} onSaveAndNext={educationNext} />
          <VisibilityStep visibility={visibility} onSave={visibilitySave} />
          <PublishBanner
            published={draft.profile?.status === 'published'}
            state={publish}
            onPublish={() => void handlePublish()}
            onGoTo={(id) => revealSection(id, true)}
          />
        </div>
      </div>
    </main>
  );
}
