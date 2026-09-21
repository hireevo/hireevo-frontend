'use client';

import Link from 'next/link';
import { useId, useState } from 'react';
import { LuExternalLink, LuGlobe, LuMapPin, LuShare2 } from 'react-icons/lu';
import { Button, Card, Chip, buttonVariants, cn } from '@hireevo/ui-web';
import { AvatarPicker } from './avatar-picker.tsx';
import type { ProfileDraft } from './draft.ts';
import { InlineEdit } from './inline-edit.tsx';

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

  // Preview does not wait for publishing. It reads
  // `/profiles/me/preview`, which serialises the owner's own profile through
  // the same rules the public page uses — so the one moment somebody wants to
  // see what they are about to put in front of buyers is a moment they can.
  //
  // Share still does wait, because there is nothing to share: the public route
  // answers 404 until the profile is published, so a copied link would lead
  // nowhere. It is refused rather than hidden, and says why. `aria-disabled`
  // rather than `disabled` keeps it in the tab order with its reason attached.
  const shareable = path !== null && published;

  return (
    <div className={COLUMN}>
      <div className="flex items-center gap-2">
        {shareable ? (
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
        ) : (
          <button
            type="button"
            aria-disabled="true"
            aria-describedby={reasonId}
            className={cn(
              buttonVariants({ variant: 'secondary', size: 'sm' }),
              CONTROL,
              'cursor-not-allowed bg-surface-muted text-content-muted hover:bg-surface-muted',
            )}
          >
            <LuShare2 aria-hidden="true" className="size-3.5" />
            Share
          </button>
        )}

        <Link
          href="/profile/preview"
          className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }), CONTROL)}
        >
          <LuExternalLink aria-hidden="true" className="size-3.5" />
          Preview
        </Link>
      </div>

      {/* Under the buttons rather than beside them: the design's corner is
          these two controls, and a sentence in front of them moves them. */}
      <p
        {...(shareable ? { role: 'status', 'aria-live': 'polite' } : { id: reasonId })}
        className="text-xs text-content-subtle"
      >
        {shareable ? (copied ? 'Link copied' : '') : 'Publish to share a link'}
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
  /**
   * Only the starred ones sit beside the name.
   *
   * Adding, starring and removing all happen in the Languages section further
   * down the page. This card is the one the published profile draws, so it
   * shows what that shows and nothing else — and a control that added a
   * language here would have been in the one place a new language usually does
   * not appear.
   */
  const starred = draft.languages.filter((language) => language.starred);

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

          {starred.length === 0 ? null : (
            <span className="inline-flex min-w-0 flex-wrap items-center gap-2">
              <LuGlobe aria-hidden="true" className="size-4 shrink-0 text-content-subtle" />
              {starred.map((language) => (
                <Chip key={language.name}>
                  {language.name} &middot; {language.proficiency}
                </Chip>
              ))}
            </span>
          )}
        </div>
      </div>

      <PublicLinks slug={slug} published={published} />
    </Card>
  );
}
