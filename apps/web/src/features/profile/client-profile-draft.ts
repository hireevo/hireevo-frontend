'use client';

import type { IdentityValues } from '@/features/profile-setup/api.ts';
import type { Entry } from '@/features/profile-setup/use-entries.ts';
import type { ProfileLanguage, ProfileRecord } from './draft.ts';

/**
 * The client profile's unfinished work, kept in this browser.
 *
 * Someone filling in six sections will close the tab in the middle of it, and
 * only the About fields have somewhere on the server to go. So everything typed
 * is written here as it is typed, and read back when the page opens again.
 *
 * This is this browser only — not the account, not another device. What has been
 * saved to the profile API is on the server; what has not says so on screen. The
 * key carries the account id so two people sharing a computer never see each
 * other's draft, and a version so an older shape is dropped rather than half
 * read.
 */
const VERSION = 1;

export type StoredDraft = {
  version: number;
  identity: IdentityValues;
  country: string;
  languages: ProfileLanguage[];
  skills: Entry<string>[];
  experience: Entry<string>[];
  education: Entry<string>[];
  licenses: Entry<string>[];
  portfolio: ProfileRecord[];
};

export type DraftContents = Omit<StoredDraft, 'version'>;

const keyFor = (userId: string) => `hireevo.client-profile-draft.${userId}`;

/** A stored draft, or null when there is none, storage is blocked, or it is older. */
export function readDraft(userId: string): DraftContents | null {
  try {
    const raw = window.localStorage.getItem(keyFor(userId));
    if (raw === null) return null;
    const parsed = JSON.parse(raw) as Partial<StoredDraft>;
    if (parsed.version !== VERSION || parsed.identity === undefined) return null;
    const { version: _version, ...contents } = parsed as StoredDraft;
    return contents;
  } catch {
    // Private windows and blocked storage throw on read. A draft nobody can
    // read is the same as no draft: the page opens on what the server holds.
    return null;
  }
}

export function writeDraft(userId: string, contents: DraftContents): void {
  try {
    window.localStorage.setItem(keyFor(userId), JSON.stringify({ version: VERSION, ...contents }));
  } catch {
    // Out of quota, or storage blocked. Nothing on screen changes: what is typed
    // is still in the page, and what was saved is still on the server.
  }
}

/**
 * Stored entries as a list's own fields, dropping anything that is no longer one
 * of them — a draft written before a field was added or renamed still opens.
 */
export function entriesFrom<F extends string>(
  fields: readonly F[],
  stored: Entry<string>[] | undefined,
): Entry<F>[] | undefined {
  if (stored === undefined) return undefined;
  return stored.map((item) => ({
    key: item.key,
    values: Object.fromEntries(fields.map((field) => [field, item.values[field] ?? ''])) as Record<
      F,
      string
    >,
  }));
}
