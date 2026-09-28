'use client';

import type { ProfileValues, RateValue } from '@/features/profile-setup/api.ts';
import type { Entry } from '@/features/profile-setup/use-entries.ts';
import type { DraftFile } from '@/features/media/upload.ts';
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
const VERSION = 6;

export type StoredDraft = {
  version: number;
  /**
   * The profile version this draft was written against.
   *
   * Without it a draft outranks the server for ever: the page opens on whatever
   * this browser kept, and a draft written before ten images were attached
   * showed a portfolio with none of them — and would have cleared them at the
   * next save, because a list is written whole. A draft is only newer than the
   * server while the server has not moved on, and this is what says so.
   */
  profileVersion?: number;
  /** Partial: a draft written before a field existed still opens. */
  identity: Partial<ProfileValues>;
  country: string;
  languages: ProfileLanguage[];
  skills: Entry<string>[];
  experience: Entry<string>[];
  education: Entry<string>[];
  licenses: Entry<string>[];
  portfolio: ProfileRecord[];
  /** Optional: a draft written before prices were a list still opens. */
  rates?: RateValue[];
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

/**
 * A file as it can be written down: without the preview this tab is holding.
 *
 * A file chosen a moment ago shows from a `blob:` address belonging to this
 * document, and that address dies with the page. Keeping it in the draft is
 * keeping a picture nobody can ever load again — which is what a reload used
 * to show: the tiles were there and every one of them was empty. The object is
 * already in storage, and the profile knows where; the draft only has to not
 * lie about it.
 */
const withoutPreviews = (files: readonly DraftFile[]): DraftFile[] =>
  files.map(({ url, thumbUrl, ...file }) => ({
    ...file,
    ...(url !== undefined && url !== null && !url.startsWith('blob:') ? { url } : {}),
    ...(thumbUrl !== undefined && thumbUrl !== null && !thumbUrl.startsWith('blob:')
      ? { thumbUrl }
      : {}),
  }));

export function writeDraft(userId: string, contents: DraftContents): void {
  try {
    const kept: DraftContents = {
      ...contents,
      licenses: contents.licenses.map((entry) => ({
        ...entry,
        files: withoutPreviews(entry.files ?? []),
      })),
      portfolio: contents.portfolio.map((piece) => ({
        ...piece,
        files: withoutPreviews(piece.files ?? []),
      })),
    };
    window.localStorage.setItem(keyFor(userId), JSON.stringify({ version: VERSION, ...kept }));
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
