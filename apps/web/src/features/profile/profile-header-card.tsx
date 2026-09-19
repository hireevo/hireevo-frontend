'use client';

import { useState } from 'react';
import { LuExternalLink, LuGlobe, LuMapPin, LuShare2 } from 'react-icons/lu';
import { Button, Card, Chip, buttonVariants, cn } from '@hireevo/ui-web';
import { AvatarPicker } from './avatar-picker.tsx';
import type { ProfileDraft, ProfileLanguage } from './draft.ts';
import { InlineEdit } from './inline-edit.tsx';
import { LanguageAdder } from './language-adder.tsx';

const CONTROL = 'h-9 rounded-lg px-3 text-[0.8125rem] font-semibold';

/**
 * The two things someone does with a published profile: send it to a buyer, and
 * look at what that buyer will see.
 *
 * Preview is a plain anchor to a new tab rather than a client-side navigation:
 * the point is to leave the editor behind and see the page as it is served.
 * Share copies the address, and says so where it was pressed — a clipboard that
 * gives no sign of having worked is indistinguishable from one that did not.
 */
function PublicLinks({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);
  const path = `/p/${slug}`;

  async function share() {
    try {
      await navigator.clipboard.writeText(new URL(path, window.location.origin).toString());
      setCopied(true);
    } catch {
      // Denied, or no clipboard at all. The link is still one tab away.
      setCopied(false);
    }
  }

  return (
    <div className="absolute top-5 right-5 flex items-center gap-2">
      <p role="status" aria-live="polite" className="text-xs text-content-subtle">
        {copied ? 'Link copied' : ''}
      </p>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        onClick={() => void share()}
        className={CONTROL}
      >
        <LuShare2 aria-hidden="true" className="size-3.5" />
        Share
      </Button>
      <a
        href={path}
        target="_blank"
        rel="noreferrer"
        className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }), CONTROL)}
      >
        <LuExternalLink aria-hidden="true" className="size-3.5" />
        Preview
      </a>
    </div>
  );
}

export type ProfileHeaderCardProps = {
  draft: ProfileDraft;
  /** The account's handle. Shown, never edited — it is set at sign-up. */
  username: string | null;
  /**
   * The published profile's slug, or null while there is nothing published.
   *
   * Null hides sharing and previewing rather than offering them: the API
   * answers 404 for a profile that is not published, so a link copied from
   * here would lead nowhere and a preview would open a missing page.
   */
  slug: string | null;
  onChange: (patch: Partial<ProfileDraft>) => void;
};

export function ProfileHeaderCard({ draft, username, slug, onChange }: ProfileHeaderCardProps) {
  const addLanguage = (language: ProfileLanguage) =>
    onChange({ languages: [...draft.languages, language] });

  const removeLanguage = (name: string) =>
    onChange({ languages: draft.languages.filter((language) => language.name !== name) });

  return (
    <Card aria-labelledby="profile-identity" className="relative flex items-start gap-6">
      {slug === null ? null : <PublicLinks slug={slug} />}
      <AvatarPicker
        url={draft.avatarUrl}
        onChange={(photo) => onChange({ avatarUrl: photo.url, avatarKey: photo.key })}
      />

      <div className="min-w-0 flex-1">
        <h2 id="profile-identity" className="sr-only">
          Your name and details
        </h2>

        <div className="flex flex-wrap items-center gap-x-1 gap-y-1">
          <InlineEdit
            value={draft.displayName}
            placeholder="Add display name"
            label="Edit display name"
            onSave={(displayName) => onChange({ displayName })}
            className="-ml-2 text-[1.375rem] leading-8 font-bold"
          />
          {username === null ? null : (
            <span className="text-base text-content-subtle">@{username}</span>
          )}
        </div>

        <InlineEdit
          value={draft.title}
          placeholder="Add title"
          label="Edit professional title"
          onSave={(title) => onChange({ title })}
          className="-ml-2 mt-0.5 block text-sm text-content-muted"
        />

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="inline-flex items-center gap-1 text-sm text-content-muted">
            <LuMapPin aria-hidden="true" className="size-4 shrink-0 text-content-subtle" />
            {/* The frame shows "Pakistan" with no edit control, which implies it
                is derived from the account. Nothing on the account carries a
                country yet, so it is filled in here rather than left blank with
                no way to set it. */}
            <InlineEdit
              value={draft.country}
              placeholder="Add location"
              label="Edit location"
              maxLength={56}
              onSave={(country) => onChange({ country })}
              className="-mx-1 px-1"
            />
          </span>

          <span className="inline-flex flex-wrap items-center gap-2">
            <LuGlobe aria-hidden="true" className="size-4 shrink-0 text-content-subtle" />
            {draft.languages.map((language) => (
              <Chip
                key={language.name}
                onRemove={() => removeLanguage(language.name)}
                removeLabel={`Remove ${language.name}`}
              >
                {language.name} &middot; {language.proficiency}
              </Chip>
            ))}
            <LanguageAdder chosen={draft.languages} onAdd={addLanguage} />
          </span>
        </div>
      </div>
    </Card>
  );
}
