'use client';

import { useId, useState } from 'react';
import { LuExternalLink, LuGlobe, LuMapPin, LuShare2 } from 'react-icons/lu';
import { Button, Card, Chip, buttonVariants, cn } from '@hireevo/ui-web';
import { AvatarPicker } from './avatar-picker.tsx';
import type { ProfileDraft, ProfileLanguage } from './draft.ts';
import { InlineEdit } from './inline-edit.tsx';
import { LanguageAdder } from './language-adder.tsx';

const CONTROL = 'h-9 rounded-lg px-3 text-[0.8125rem] font-semibold';

/** The card's top-right corner, as the design draws it — and its own row below `sm`. */
const COLUMN = 'flex w-full shrink-0 flex-col gap-1.5 sm:w-auto sm:items-end';

/**
 * The two things someone does with a published profile: send it to a buyer, and
 * look at what that buyer will see.
 *
 * Preview is a plain anchor to a new tab rather than a client-side navigation:
 * the point is to leave the editor behind and see the page as it is served.
 * Share copies the address, and says so where it was pressed — a clipboard that
 * gives no sign of having worked is indistinguishable from one that did not.
 */
function PublicLinks({ slug, published }: { slug: string | null; published: boolean }) {
  const [copied, setCopied] = useState(false);
  const reasonId = useId();
  const path = slug === null ? null : `/p/${slug}`;

  async function share() {
    if (path === null) return;
    try {
      await navigator.clipboard.writeText(new URL(path, window.location.origin).toString());
      setCopied(true);
    } catch {
      // Denied, or no clipboard at all. The link is still one tab away.
      setCopied(false);
    }
  }

  // Both are drawn either way, as the design draws them. Before publishing they
  // are refused rather than hidden, and say why: the API answers 404 for a
  // profile that is not published, so the link would lead nowhere and the
  // preview would open a missing page. `aria-disabled` rather than `disabled`
  // keeps them in the tab order with their reason attached.
  if (path === null || !published) {
    const locked = cn(
      buttonVariants({ variant: 'secondary', size: 'sm' }),
      CONTROL,
      'cursor-not-allowed bg-surface-muted text-content-muted hover:bg-surface-muted',
    );

    return (
      <div className={COLUMN}>
        <div className="flex items-center gap-2">
          <button type="button" aria-disabled="true" aria-describedby={reasonId} className={locked}>
            <LuShare2 aria-hidden="true" className="size-3.5" />
            Share
          </button>
          <button type="button" aria-disabled="true" aria-describedby={reasonId} className={locked}>
            <LuExternalLink aria-hidden="true" className="size-3.5" />
            Preview
          </button>
        </div>
        {/* Under the buttons rather than beside them: the design's corner is
            these two controls, and a sentence in front of them moves them. */}
        <p id={reasonId} className="text-xs text-content-subtle">
          Publish to share or preview
        </p>
      </div>
    );
  }

  return (
    <div className={COLUMN}>
      <div className="flex items-center gap-2">
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
      <p role="status" aria-live="polite" className="text-xs text-content-subtle">
        {copied ? 'Link copied' : ''}
      </p>
    </div>
  );
}

export type ProfileHeaderCardProps = {
  draft: ProfileDraft;
  /** The account's handle. Shown, never edited — it is set at sign-up. */
  username: string | null;
  /** The profile's public slug, and whether there is anything published at it. */
  slug: string | null;
  published: boolean;
  /**
   * False until "Complete your profile" turns editing on. The sections below
   * already follow that rule; this card has to follow it too, or the page a
   * person lands on is half read-only and half a form.
   */
  editable: boolean;
  onChange: (patch: Partial<ProfileDraft>) => void;
};

export function ProfileHeaderCard({
  draft,
  username,
  slug,
  published,
  editable,
  onChange,
}: ProfileHeaderCardProps) {
  const addLanguage = (language: ProfileLanguage) =>
    onChange({ languages: [...draft.languages, language] });

  const removeLanguage = (name: string) =>
    onChange({ languages: draft.languages.filter((language) => language.name !== name) });

  return (
    // Wraps only below `sm`, where three columns leave none of them usable.
    // From there the row holds: photo, details, and the two public controls in
    // the corner the design puts them in.
    <Card
      aria-labelledby="profile-identity"
      className="flex flex-wrap items-start gap-x-6 gap-y-4 sm:flex-nowrap"
    >
      <AvatarPicker
        url={draft.avatarUrl}
        editable={editable}
        onChange={(photo) => onChange({ avatarUrl: photo.url, avatarKey: photo.key })}
      />

      {/* `min-w-0` so this column gives way to the corner's controls rather
          than pushing them onto a line of their own. */}
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
            editable={editable}
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
          editable={editable}
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
              editable={editable}
              className="-mx-1 px-1"
            />
          </span>

          <span className="inline-flex flex-wrap items-center gap-2">
            <LuGlobe aria-hidden="true" className="size-4 shrink-0 text-content-subtle" />
            {draft.languages.map((language) => (
              <Chip
                key={language.name}
                {...(editable ? { onRemove: () => removeLanguage(language.name) } : {})}
                removeLabel={`Remove ${language.name}`}
              >
                {language.name} &middot; {language.proficiency}
              </Chip>
            ))}
            {editable ? <LanguageAdder chosen={draft.languages} onAdd={addLanguage} /> : null}
          </span>
        </div>
      </div>

      <PublicLinks slug={slug} published={published} />
    </Card>
  );
}
