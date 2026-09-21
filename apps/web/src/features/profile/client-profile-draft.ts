'use client';

import type { ProfileValues } from '@/features/profile-setup/api.ts';
import type { Entry } from '@/features/profile-setup/use-entries.ts';
import type { ProfileLanguage, ProfileRecord } from './draft.ts';

/**
 * The client profile's unfinished work, kept in this browser.
 *
 * The page saves on a button rather than as it is typed, so someone who fills
 * in three sections and closes the tab has told the server nothing. Everything
 * typed is written here as it is typed, and read back when the page opens
 * again, so that work survives the tab.
 *
 * This is a safety net under the save, not a second place the profile lives:
 * what has been saved is on the server, and a draft is only ever newer than
 * that. The key carries the account id so two people sharing a computer never
 * see each other's draft, and a version so an older shape is dropped rather
 * than half read.
 */
const VERSION = 4;

export type StoredDraft = {
  version: number;
  /** Partial: a draft written before a field existed still opens. */
  identity: Partial<ProfileValues>;
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

/** Forgets the draft, once what it was protecting has been saved. */
export function clearDraft(userId: string): void {
  try {
    window.localStorage.removeItem(keyFor(userId));
  } catch {
    // Blocked storage. There is nothing to forget that anyone can read anyway.
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
    // Certifications carry their attachments through the draft too, so a scan
    // uploaded before the tab closed is still there when it opens again.
    ...(item.files === undefined ? {} : { files: item.files }),
  }));
}
