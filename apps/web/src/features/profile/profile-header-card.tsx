'use client';

import { LuGlobe, LuMapPin } from 'react-icons/lu';
import { Card, Chip } from '@hireevo/ui-web';
import { AvatarPicker } from './avatar-picker.tsx';
import type { ProfileDraft, ProfileLanguage } from './draft.ts';
import { InlineEdit } from './inline-edit.tsx';
import { LanguageAdder } from './language-adder.tsx';

export type ProfileHeaderCardProps = {
  draft: ProfileDraft;
  /** The account's handle. Shown, never edited — it is set at sign-up. */
  username: string | null;
  onChange: (patch: Partial<ProfileDraft>) => void;
};

export function ProfileHeaderCard({ draft, username, onChange }: ProfileHeaderCardProps) {
  const addLanguage = (language: ProfileLanguage) =>
    onChange({ languages: [...draft.languages, language] });

  const removeLanguage = (name: string) =>
    onChange({ languages: draft.languages.filter((language) => language.name !== name) });

  return (
    <Card aria-labelledby="profile-identity" className="flex items-start gap-6">
      <AvatarPicker url={draft.avatarUrl} onChange={(url) => onChange({ avatarUrl: url })} />

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
