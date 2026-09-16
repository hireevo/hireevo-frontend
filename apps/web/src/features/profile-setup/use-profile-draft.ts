'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  EMPTY_VALUES,
  loadOrCreateProfile,
  saveProfile,
  toPayload,
  valuesOf,
  type FieldErrors,
  type OwnProfile,
  type ProfileField,
  type ProfileValues,
} from './api.ts';
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
const keyOf = (values: ProfileValues, sections: SectionsPayload | undefined) =>
  JSON.stringify([toPayload(values), sections ?? null]);

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
} = {}) {
  const [load, setLoad] = useState<LoadState>({ status: 'loading' });
  const [profile, setProfile] = useState<OwnProfile | null>(null);
  const [values, setValues] = useState<ProfileValues>(EMPTY_VALUES);
  const [save, setSave] = useState<SaveState>({ kind: 'saved', at: null });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const latest = useRef(EMPTY_VALUES);
  const version = useRef(0);
  const savedKey = useRef('');
  const savedAt = useRef<Date | null>(null);
  const blocked = useRef(false);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallback = useRef(fallbackDisplayName);
  const restored = useRef(restore);
  const sections = useRef(collect);

  // Before the load effect below, so the first response already has them.
  useEffect(() => {
    fallback.current = fallbackDisplayName;
    restored.current = restore;
    sections.current = collect;
  }, [fallbackDisplayName, restore, collect]);

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
    savedKey.current = keyOf(loaded, sections.current?.());
    blocked.current = false;
    setProfile(result.profile);
    setValues(opening);
    setFieldErrors({});
    // By value, not by identity: a restored draft equal to the server is saved.
    setSave(
      keyOf(opening, sections.current?.()) === savedKey.current
        ? { kind: 'saved', at: savedAt.current }
        : { kind: 'unsaved' },
    );
    setLoad({ status: 'ready' });
  }, []);

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

  const saveOnce = useCallback(async (): Promise<boolean> => {
    if (blocked.current) return false;
    const sending = latest.current;
    const lists = sections.current?.();
    const key = keyOf(sending, lists);
    if (key === savedKey.current) {
      setSave({ kind: 'saved', at: savedAt.current });
      return true;
    }

    setSave({ kind: 'saving' });
    const result = await saveProfile(version.current, sending, lists);

    if (result.ok) {
      version.current = result.profile.version;
      // A photo is claimed once. Left in the form it would be sent with every
      // later save, re-claiming a key the profile already holds.
      savedKey.current = keyOf({ ...sending, avatarKey: '' }, lists);
      savedAt.current = new Date();
      if (latest.current.avatarKey !== '') {
        latest.current = { ...latest.current, avatarKey: '' };
        setValues(latest.current);
      }
      setProfile(result.profile);
      setFieldErrors({});
      // Only "saved" if nothing else was typed while this was on its way.
      setSave(
        keyOf(latest.current, sections.current?.()) === savedKey.current
          ? { kind: 'saved', at: savedAt.current }
          : { kind: 'unsaved' },
      );
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
  }, []);

  /** Runs a save after every save already queued, and answers whether it left nothing unsaved. */
  const enqueue = useCallback((): Promise<boolean> => {
    const next = queue.current.then(saveOnce);
    queue.current = next.catch(() => false);
    return next;
  }, [saveOnce]);

  /** Marks the draft changed, and starts the wait before an autosave. */
  const touch = useCallback(() => {
    if (blocked.current) return;
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
  const flush = useCallback((): Promise<boolean> => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    return enqueue();
  }, [enqueue]);

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
    savedKey.current = keyOf(latest.current, sections.current?.());
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
    /** The version a sibling write — visibility — has to send with it. */
    version: () => version.current,
  };
}

export type ProfileDraftState = ReturnType<typeof useProfileDraft>;
