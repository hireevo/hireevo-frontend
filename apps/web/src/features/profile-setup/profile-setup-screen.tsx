'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@hireevo/ui-web';
import { publishProfile, type OwnProfile } from './api.ts';
import { DraftStatusCard } from './draft-status-card.tsx';
import { IdentityStep } from './identity-step.tsx';
import { LocationStep } from './location-step.tsx';
import { PublishBanner, type PublishState } from './publish-banner.tsx';
import { SetupSidebar } from './setup-sidebar.tsx';
import { FIELD_STEP, hrefFor, stepFor, type StepId } from './steps.ts';
import { UnbuiltStep } from './unbuilt-step.tsx';
import { useLocationDraft } from './use-location-draft.ts';
import { useProfileDraft } from './use-profile-draft.ts';

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

/** Shown while Location and rate holds anything, until the API can store it. */
export const LOCATION_NOT_SAVED =
  'Saved changes cover Identity and story. Location and rate is not connected to your profile yet: it stays on this page and is lost on reload.';

export function ProfileSetupScreen({ autosaveDelay }: { autosaveDelay?: number }) {
  const router = useRouter();
  const step = stepFor(useSearchParams().get('step'));
  const draft = useProfileDraft(autosaveDelay === undefined ? {} : { autosaveDelay });
  const [publish, setPublish] = useState<PublishState>({ kind: 'idle' });
  const location = useLocationDraft();

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

  async function saveAndNext() {
    if (await draft.flush()) router.push(hrefFor('location'));
  }

  function locationNext(): boolean {
    if (Object.keys(location.checkAll()).length > 0) return false;
    router.push(hrefFor('skills'));
    return true;
  }

  const completed = new Set<StepId>();
  if (identitySaved(draft.profile)) completed.add('identity');
  if (location.complete) completed.add('location');

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
        <div className="flex flex-col gap-4">
          <SetupSidebar current={step} completed={completed} />
          <DraftStatusCard
            save={draft.save}
            sectionsSaved={sectionsSavedIn(draft.profile)}
            onRetry={() => void draft.flush()}
            onReload={() => void draft.reload()}
            notice={step.id === 'location' && location.dirty ? LOCATION_NOT_SAVED : null}
          />
        </div>

        <div className="flex min-w-0 flex-col gap-5 lg:gap-6">
          {step.id === 'identity' ? (
            <IdentityStep
              values={draft.values}
              fieldErrors={draft.fieldErrors}
              onChange={draft.change}
              onSaveAndNext={() => void saveAndNext()}
              saving={draft.save.kind === 'saving'}
            />
          ) : step.id === 'location' ? (
            <LocationStep
              values={location.values}
              errors={location.errors}
              onChange={location.change}
              onBlurField={location.settle}
              onSaveAndNext={locationNext}
            />
          ) : (
            <UnbuiltStep step={step} />
          )}
          <PublishBanner
            published={draft.profile?.status === 'published'}
            state={publish}
            onPublish={() => void handlePublish()}
          />
        </div>
      </div>
    </main>
  );
}
