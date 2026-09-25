'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  EMPTY_VALUES,
  loadOrCreateProfile,
  saveProfilePatch,
  toContactPayload,
  toPayload,
  toRatesPayload,
  valuesOf,
  type ContactValues,
  type FieldErrors,
  type ProfilePatch,
  type OwnProfile,
  type ProfileField,
  type ProfileValues,
  type RateValue,
} from './api.ts';
import { onProfileChanged, profileChanged } from './profile-events.ts';
import type { SectionsPayload } from './sections-payload.ts';

export type SaveState =
  | { kind: 'saved'; at: Date | null }
  | { kind: 'unsaved' }
  | { kind: 'saving' }
  | { kind: 'failed'; message: string }
  | { kind: 'conflict'; message: string };

export type LoadState =
  { status: 'loading' } | { status: 'ready' } | { status: 'error'; message: string };

/**
 * What the server would store, so trailing spaces alone do not count as an
 * unsaved change — and so a list edited back to what it was stops asking to be
 * saved. Built from the payload rather than the form, because the payload is
 * what a save would actually send.
 */
/**
 * The parts a save can carry, each saved on its own.
 *
 * The API leaves out every key a request does not mention, so a section saved
 * by itself is a body with that one list in it. Naming the parts here is what
 * lets a card ask for its own to be sent, and lets its button know whether
 * there is anything to send.
 */
export const SECTION_PARTS = [
  'languages',
  'skills',
  'experience',
  'education',
  'licenses',
  'portfolio',
] as const;

export type SectionPart = (typeof SECTION_PARTS)[number];

/**
 * The profile's own fields, grouped by the card that edits them.
 *
 * One part per card rather than one for all of them, because a part is what a
 * card reports as unsaved: with a single "profile" part, typing a biography
 * marked the working preferences and the video intro unsaved as well, which is
 * true of the row and useless to the person reading it.
 *
 * Every field belongs to exactly one group. The header's name, title, location
 * and photo sit with About: the header is the profile's identity and About is
 * its story, and between them they are the profile's details — saved together
 * by the one card that carries a Save for them.
 */
export const PROFILE_GROUPS = {
  about: [
    'displayName',
    'headline',
    'overview',
    'availabilityNote',
    'locationCountry',
    'locationRegion',
    'locationCity',
    'serviceArea',
    'timezone',
    'avatarKey',
  ],
  preferences: ['remoteMode', 'responseTime', 'projectLength', 'availableFrom'],
  video: ['videoIntroUrl'],
} as const satisfies Record<string, readonly ProfileField[]>;

export type ProfilePart = keyof typeof PROFILE_GROUPS;
export const PROFILE_PARTS = Object.keys(PROFILE_GROUPS) as ProfilePart[];

export type SavePart = ProfilePart | 'rates' | 'contact' | SectionPart;

export const SAVE_PARTS: readonly SavePart[] = [
  ...PROFILE_PARTS,
  'rates',
  'contact',
  ...SECTION_PARTS,
];

const isProfilePart = (part: SavePart): part is ProfilePart =>
  (PROFILE_PARTS as readonly SavePart[]).includes(part);

/** The payload keys a part owns, so a save carries the fields of the cards it is for. */
function fieldsOf(values: ProfileValues, parts: readonly ProfilePart[]) {
  const payload = toPayload(values);
  const wanted = new Set(parts.flatMap((part) => PROFILE_GROUPS[part] as readonly string[]));
  return Object.fromEntries(Object.entries(payload).filter(([key]) => wanted.has(key))) as Partial<
    ReturnType<typeof toPayload>
  >;
}

/**
 * What the server would store for each part.
 *
 * Compared part by part rather than as one string, so a card can tell whether
 * *its* part differs from what was saved — and so a save of one part leaves
 * every other part's "unsaved" standing. Built from the payload rather than the
 * form, because the payload is what a save would actually send: trailing spaces
 * alone are not a change.
 */
function partsOf(
  values: ProfileValues,
  sections: SectionsPayload | undefined,
  rates: RateValue[] | undefined,
  contact: ContactValues | undefined,
): Record<SavePart, string> {
  // The prices travel beside the fields but are their own part, because the
  // card that edits them is its own card.
  return {
    ...(Object.fromEntries(
      PROFILE_PARTS.map((part) => [part, JSON.stringify(fieldsOf(values, [part]))]),
    ) as Record<ProfilePart, string>),
    rates: JSON.stringify(rates && toRatesPayload(rates)),
    contact: JSON.stringify(contact && toContactPayload(contact)),
    ...(Object.fromEntries(
      SECTION_PARTS.map((part) => [part, JSON.stringify(sections?.[part] ?? null)]),
    ) as Record<SectionPart, string>),
  };
}

/** Which parts differ from what was last saved. */
function differing(
  current: Record<SavePart, string>,
  saved: Partial<Record<SavePart, string>>,
  within: readonly SavePart[],
): SavePart[] {
  return within.filter((part) => current[part] !== saved[part]);
}

/**
 * The profile being edited: loaded from the API, saved back to it.
 *
 * Saves run one at a time, in order. Two overlapping saves would both carry the
 * version the form was loaded at, and the second would be refused as a conflict
 * with the first — the person's own tab mistaken for another one. What each
 * save sends is read when it starts, so a burst of typing costs one request,
 * not one per keystroke.
 *
 * Fields and lists go together in that one request. They are one profile at one
 * version: sending them separately would make the second half lose to the
 * first, and leave a half-saved profile when the second never arrived.
 *
 * A real conflict stops saving. Carrying on would either be refused on every
 * keystroke or, worse, succeed once the version was refreshed and overwrite
 * whatever the other tab saved. The person reloads instead.
 */
export function useProfileDraft({
  autosaveDelay = 800,
  autosave = true,
  fallbackDisplayName = '',
  restore,
  collect,
  collectRates,
  collectContact,
}: {
  autosaveDelay?: number;
  /**
   * Off where a screen saves on a button of its own: what is typed is still
   * kept, and `flush` is what sends it.
   */
  autosave?: boolean;
  /**
   * Fills the display name when the profile has none — the account's own name,
   * so a new profile opens with the person's name rather than a placeholder.
   * It counts as unsaved until something is saved, and the status says so.
   */
  fallbackDisplayName?: string;
  /** Values typed before and not saved — a draft read back from this browser. */
  restore?: Partial<ProfileValues> | undefined;
  /**
   * The lists to save alongside the fields, read when a save starts rather than
   * held here: they live in the components that edit them, and what matters is
   * what they hold at the moment the request goes out.
   */
  collect?: (() => SectionsPayload) | undefined;
  /**
   * The prices, read the same way and for the same reason: they are a list
   * that lives in the editor that shows them, and what matters is what it
   * holds when the request goes out.
   */
  collectRates?: (() => RateValue[]) | undefined;
  /**
   * The ways to reach this person, read at save time like the lists above.
   *
   * They live in the editor that shows them rather than here, because what has
   * to be sent is what that editor holds the moment the request goes out.
   */
  collectContact?: (() => ContactValues) | undefined;
} = {}) {
  const [load, setLoad] = useState<LoadState>({ status: 'loading' });
  const [profile, setProfile] = useState<OwnProfile | null>(null);
  const [values, setValues] = useState<ProfileValues>(EMPTY_VALUES);
  const [save, setSave] = useState<SaveState>({ kind: 'saved', at: null });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const latest = useRef(EMPTY_VALUES);
  const version = useRef(0);
  const savedParts = useRef<Partial<Record<SavePart, string>>>({});
  const [unsaved, setUnsaved] = useState<readonly SavePart[]>([]);
  /** Which parts a save is carrying right now, so each card can show its own. */
  const [saving, setSaving] = useState<readonly SavePart[]>([]);
  const savedAt = useRef<Date | null>(null);
  const blocked = useRef(false);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallback = useRef(fallbackDisplayName);
  const restored = useRef(restore);
  const sections = useRef(collect);
  const rates = useRef(collectRates);
  const contact = useRef(collectContact);

  // Before the load effect below, so the first response already has them.
  useEffect(() => {
    fallback.current = fallbackDisplayName;
    restored.current = restore;
    sections.current = collect;
    rates.current = collectRates;
    contact.current = collectContact;
  }, [fallbackDisplayName, restore, collect, collectRates, collectContact]);

  /** Applies what a load returned. Called only after the request settles, never during render or an effect body. */
  const accept = useCallback((result: Awaited<ReturnType<typeof loadOrCreateProfile>>) => {
    if (!result.ok) {
      setLoad({ status: 'error', message: result.message });
      return;
    }
    const loaded = valuesOf(result.profile);
    // A draft of this profile wins over what the server holds: it is the later
    // of the two, and it is the work the person has not saved yet.
    const withDraft = { ...loaded, ...restored.current };
    const opening =
      withDraft.displayName.trim() === '' && fallback.current.trim() !== ''
        ? { ...withDraft, displayName: fallback.current }
        : withDraft;
    latest.current = opening;
    version.current = result.profile.version;
    // Keyed on what the server holds, not on the fallback, so a filled-in name
    // is saved by the next save rather than mistaken for something already sent.
    savedParts.current = partsOf(
      loaded,
      sections.current?.(),
      rates.current?.(),
      contact.current?.(),
    );
    blocked.current = false;
    setProfile(result.profile);
    setValues(opening);
    setFieldErrors({});
    // By value, not by identity: a restored draft equal to the server is saved.
    const opened = differing(
      partsOf(opening, sections.current?.(), rates.current?.(), contact.current?.()),
      savedParts.current,
      SAVE_PARTS,
    );
    setUnsaved(opened);
    setSave(opened.length === 0 ? { kind: 'saved', at: savedAt.current } : { kind: 'unsaved' });
    setLoad({ status: 'ready' });
    // The bar above the page writes the same profile; it needs the version this
    // read came back with.
    profileChanged(result.profile);
  }, []);

  // And the other way: when something else moves the profile on, take the
  // version it moved to. What is typed here is untouched — only the version
  // the next save will carry.
  useEffect(
    () =>
      onProfileChanged((next) => {
        if (next.version <= version.current) return;
        version.current = next.version;
        setProfile(next);
      }),
    [],
  );

  // The first load. State starts as "loading", so nothing is set until the
  // request answers — setting it synchronously here would render twice for
  // nothing. A response arriving after unmount is dropped.
  useEffect(() => {
    let active = true;
    void loadOrCreateProfile().then((result) => {
      if (active) accept(result);
    });
    return () => {
      active = false;
      if (timer.current !== null) clearTimeout(timer.current);
    };
  }, [accept]);

  /** Loads again on request — after a conflict, or a failed first load. */
  const reload = useCallback(async () => {
    setLoad({ status: 'loading' });
    accept(await loadOrCreateProfile());
  }, [accept]);

  /**
   * Sends the parts of the profile that differ from what was saved.
   *
   * `within` narrows it to one card's parts, which is how a section saves
   * itself: the body carries only the keys that changed, and the API leaves
   * every key it is not sent alone. Sending the whole profile from a section's
   * button would write that section's neighbours back too — including any of
   * them left half-typed.
   */
  const saveOnce = useCallback(
    async (within: readonly SavePart[] = SAVE_PARTS): Promise<boolean> => {
      if (blocked.current) return false;
      const sending = latest.current;
      const lists = sections.current?.();
      const prices = rates.current?.();
      const reach = contact.current?.();
      const current = partsOf(sending, lists, prices, reach);
      const changed = differing(current, savedParts.current, within);

      if (changed.length === 0) {
        setSave({ kind: 'saved', at: savedAt.current });
        return true;
      }

      const patch: ProfilePatch = {};
      const changedGroups = changed.filter(isProfilePart);
      if (changedGroups.length > 0 || changed.includes('rates')) {
        patch.profile = {
          ...fieldsOf(sending, changedGroups),
          ...(changed.includes('rates') && prices !== undefined
            ? { rates: toRatesPayload(prices) }
            : {}),
        };
      }
      const changedLists = SECTION_PARTS.filter((part) => changed.includes(part));
      if (changedLists.length > 0 && lists !== undefined) {
        patch.sections = Object.fromEntries(changedLists.map((part) => [part, lists[part] ?? []]));
      }
      if (changed.includes('contact') && reach !== undefined) {
        patch.contact = toContactPayload(reach);
      }

      setSave({ kind: 'saving' });
      setSaving(changed);
      const result = await saveProfilePatch(version.current, patch);
      setSaving([]);

      if (result.ok) {
        version.current = result.profile.version;
        // A photo is claimed once. Left in the form it would be sent with every
        // later save, re-claiming a key the profile already holds.
        const sent = partsOf({ ...sending, avatarKey: '' }, lists, prices, reach);
        for (const part of changed) savedParts.current[part] = sent[part];
        savedAt.current = new Date();
        if (latest.current.avatarKey !== '') {
          latest.current = { ...latest.current, avatarKey: '' };
          setValues(latest.current);
        }
        setProfile(result.profile);
        setFieldErrors({});
        profileChanged(result.profile);
        // Only "saved" if nothing else was typed while this was on its way —
        // and only about the parts this save carried.
        const left = differing(
          partsOf(latest.current, sections.current?.(), rates.current?.(), contact.current?.()),
          savedParts.current,
          SAVE_PARTS,
        );
        setUnsaved(left);
        setSave(left.length === 0 ? { kind: 'saved', at: savedAt.current } : { kind: 'unsaved' });
        return true;
      }

      if (result.kind === 'conflict') {
        blocked.current = true;
        setSave({ kind: 'conflict', message: result.message });
      } else {
        if (result.kind === 'invalid') setFieldErrors(result.fieldErrors);
        setSave({ kind: 'failed', message: result.message });
      }
      return false;
    },
    [],
  );

  /** Runs a save after every save already queued, and answers whether it left nothing unsaved. */
  const enqueue = useCallback(
    (within?: readonly SavePart[]): Promise<boolean> => {
      const next = queue.current.then(() => saveOnce(within));
      queue.current = next.catch(() => false);
      return next;
    },
    [saveOnce],
  );

  /** Marks the draft changed, and starts the wait before an autosave. */
  const touch = useCallback(() => {
    if (blocked.current) return;
    setUnsaved(
      differing(
        partsOf(latest.current, sections.current?.(), rates.current?.(), contact.current?.()),
        savedParts.current,
        SAVE_PARTS,
      ),
    );
    setSave({ kind: 'unsaved' });
    if (!autosave) return;
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      void enqueue();
    }, autosaveDelay);
  }, [autosave, autosaveDelay, enqueue]);

  const change = useCallback(
    (field: ProfileField, value: string) => {
      const next = { ...latest.current, [field]: value };
      latest.current = next;
      setValues(next);
      setFieldErrors((current) => {
        if (current[field] === undefined) return current;
        const { [field]: _cleared, ...rest } = current;
        return rest;
      });
      touch();
    },
    [touch],
  );

  /** Saves now instead of waiting for the pause in typing. */
  const flush = useCallback(
    (within?: readonly SavePart[]): Promise<boolean> => {
      if (timer.current !== null) {
        clearTimeout(timer.current);
        timer.current = null;
      }
      return enqueue(within);
    },
    [enqueue],
  );

  /**
   * Counts what is on screen now as what the server holds.
   *
   * The lists arrive from the API after the page has rendered, so they cannot be
   * part of the profile when it loads; put into their sections a moment later,
   * they would otherwise look like unsaved work and be sent straight back. Only
   * for that moment: called once the lists have been filled in from a load, and
   * never after anything has been typed.
   */
  const rebaseline = useCallback(() => {
    savedParts.current = partsOf(
      latest.current,
      sections.current?.(),
      rates.current?.(),
      contact.current?.(),
    );
    setUnsaved([]);
  }, []);

  /** Takes a newer copy from the server — after publishing, or a visibility save. */
  const adopt = useCallback((next: OwnProfile) => {
    version.current = next.version;
    setProfile(next);
  }, []);

  // Leaving with changes the server does not have yet asks first.
  const unsafeToLeave = save.kind === 'unsaved' || save.kind === 'saving' || save.kind === 'failed';
  useEffect(() => {
    if (!unsafeToLeave) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [unsafeToLeave]);

  return {
    load,
    profile,
    values,
    save,
    fieldErrors,
    change,
    touch,
    rebaseline,
    flush,
    reload,
    adopt,
    /** The parts that differ from what was saved, so a card can offer its own Save. */
    unsaved,
    /** The parts a save is carrying now, so a card can show its own button busy. */
    saving,
    /** The version a sibling write — visibility — has to send with it. */
    version: () => version.current,
  };
}

export type ProfileDraftState = ReturnType<typeof useProfileDraft>;
