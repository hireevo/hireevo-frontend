'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  loadOrCreateProfile,
  saveIdentity,
  type FieldErrors,
  type IdentityField,
  type IdentityValues,
  type OwnProfile,
} from './api.ts';

export type SaveState =
  | { kind: 'saved'; at: Date | null }
  | { kind: 'unsaved' }
  | { kind: 'saving' }
  | { kind: 'failed'; message: string }
  | { kind: 'conflict'; message: string };

export type LoadState =
  { status: 'loading' } | { status: 'ready' } | { status: 'error'; message: string };

const EMPTY: IdentityValues = { displayName: '', headline: '', overview: '', availabilityNote: '' };

const valuesOf = (profile: OwnProfile): IdentityValues => ({
  displayName: profile.displayName ?? '',
  headline: profile.headline ?? '',
  overview: profile.overview ?? '',
  availabilityNote: profile.availabilityNote ?? '',
});

/** What the server would store, so trailing spaces alone do not count as an unsaved change. */
const keyOf = (values: IdentityValues) =>
  JSON.stringify([
    values.displayName.trim(),
    values.headline.trim(),
    values.overview.trim(),
    values.availabilityNote.trim(),
  ]);

/**
 * The identity step's draft: loaded from the API, autosaved as it is typed.
 *
 * Saves run one at a time, in order. Two overlapping autosaves would both carry
 * the version the form was loaded at, and the second would be refused as a
 * conflict with the first — the person's own tab mistaken for another one.
 * What each save sends is read when it starts, so a burst of typing costs one
 * request, not one per keystroke.
 *
 * A real conflict stops autosaving. Carrying on would either be refused on
 * every keystroke or, worse, succeed once the version was refreshed and
 * overwrite whatever the other tab saved. The person reloads instead.
 */
export function useProfileDraft({ autosaveDelay = 800 }: { autosaveDelay?: number } = {}) {
  const [load, setLoad] = useState<LoadState>({ status: 'loading' });
  const [profile, setProfile] = useState<OwnProfile | null>(null);
  const [values, setValues] = useState<IdentityValues>(EMPTY);
  const [save, setSave] = useState<SaveState>({ kind: 'saved', at: null });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const latest = useRef(EMPTY);
  const version = useRef(0);
  const savedKey = useRef(keyOf(EMPTY));
  const savedAt = useRef<Date | null>(null);
  const blocked = useRef(false);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Applies what a load returned. Called only after the request settles, never during render or an effect body. */
  const accept = useCallback((result: Awaited<ReturnType<typeof loadOrCreateProfile>>) => {
    if (!result.ok) {
      setLoad({ status: 'error', message: result.message });
      return;
    }
    const loaded = valuesOf(result.profile);
    latest.current = loaded;
    version.current = result.profile.version;
    savedKey.current = keyOf(loaded);
    blocked.current = false;
    setProfile(result.profile);
    setValues(loaded);
    setFieldErrors({});
    setSave({ kind: 'saved', at: savedAt.current });
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
    const key = keyOf(sending);
    if (key === savedKey.current) {
      setSave({ kind: 'saved', at: savedAt.current });
      return true;
    }

    setSave({ kind: 'saving' });
    const result = await saveIdentity(version.current, sending);

    if (result.ok) {
      version.current = result.profile.version;
      savedKey.current = key;
      savedAt.current = new Date();
      setProfile(result.profile);
      setFieldErrors({});
      // Only "saved" if nothing else was typed while this was on its way.
      setSave(
        keyOf(latest.current) === key
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

  const change = useCallback(
    (field: IdentityField, value: string) => {
      const next = { ...latest.current, [field]: value };
      latest.current = next;
      setValues(next);
      setFieldErrors((current) => {
        if (current[field] === undefined) return current;
        const { [field]: _cleared, ...rest } = current;
        return rest;
      });
      if (blocked.current) return;

      setSave({ kind: 'unsaved' });
      if (timer.current !== null) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        timer.current = null;
        void enqueue();
      }, autosaveDelay);
    },
    [autosaveDelay, enqueue],
  );

  /** Saves now instead of waiting for the pause in typing. */
  const flush = useCallback((): Promise<boolean> => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    return enqueue();
  }, [enqueue]);

  /** Takes a newer copy from the server — e.g. after publishing — without touching what is typed. */
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

  return { load, profile, values, save, fieldErrors, change, flush, reload, adopt };
}
