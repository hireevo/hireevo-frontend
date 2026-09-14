'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FormMessage } from '@/features/auth/form-message.tsx';
import { useSession } from '@/features/auth/session.tsx';
import { AboutSection } from './about-section.tsx';
import { saveDraft } from './api.ts';
import { CompletionBar } from './completion-bar.tsx';
import { completionOf, EMPTY_DRAFT, type ProfileDraft, type RecordSectionId } from './draft.ts';
import { ProfileHeaderCard } from './profile-header-card.tsx';
import { RecordSection } from './record-section.tsx';
import { RECORD_SPECS } from './record-specs.tsx';
import { SkillsSection } from './skills-section.tsx';

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

export function ProfileBuilder() {
  const router = useRouter();
  const { user } = useSession();
  const [draft, setDraft] = useState<ProfileDraft>(STARTING_DRAFT);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const patch = (fields: Partial<ProfileDraft>) =>
    setDraft((current) => ({ ...current, ...fields }));

  const setRecords = (id: RecordSectionId, records: ProfileDraft['records'][RecordSectionId]) =>
    setDraft((current) => ({ ...current, records: { ...current.records, [id]: records } }));

  async function handleContinue() {
    setSaving(true);
    setError(null);
    const result = await saveDraft(draft);
    setSaving(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    // Back to the workspace. The second of the five steps has no screen yet.
    router.push('/dashboard');
  }

  return (
    <div className="flex flex-col gap-5">
      <ProfileHeaderCard draft={draft} username={user?.username ?? null} onChange={patch} />

      <AboutSection value={draft.about} onChange={(about) => patch({ about })} />
      <SkillsSection value={draft.skills} onChange={(skills) => patch({ skills })} />

      <RecordSection
        spec={RECORD_SPECS.workExperience}
        records={draft.records.workExperience}
        onChange={(records) => setRecords('workExperience', records)}
      />

      {/* The only pair the design puts side by side, and only from `lg` — below
          that the column is too narrow for two of these to hold their shape. */}
      <div className="grid gap-5 lg:grid-cols-2">
        <RecordSection
          spec={RECORD_SPECS.education}
          records={draft.records.education}
          onChange={(records) => setRecords('education', records)}
        />
        <RecordSection
          spec={RECORD_SPECS.certifications}
          records={draft.records.certifications}
          onChange={(records) => setRecords('certifications', records)}
        />
      </div>

      <RecordSection
        spec={RECORD_SPECS.portfolio}
        records={draft.records.portfolio}
        onChange={(records) => setRecords('portfolio', records)}
      />

      {error === null ? null : (
        <div className="mt-8">
          <FormMessage>{error}</FormMessage>
        </div>
      )}

      <div className="mt-11">
        <CompletionBar
          completion={completionOf(draft)}
          pending={saving}
          onContinue={() => void handleContinue()}
        />
      </div>
    </div>
  );
}
