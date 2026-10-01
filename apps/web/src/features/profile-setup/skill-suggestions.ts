'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api.ts';

/**
 * The approved skills that match what is being typed.
 *
 * Returns just the names — the editor stores the person's words, and the API
 * settles which are approved on the save, so the chip only needs the text to
 * offer. A failed request answers with nothing rather than an error: a dropdown
 * that cannot reach the server simply shows no suggestions, and the person types
 * on, which is allowed.
 */
export async function fetchSkillSuggestions(query: string): Promise<string[]> {
  try {
    const { data } = await api.GET('/api/v1/skills', { params: { query: { query } } });
    return data?.skills.map((skill) => skill.name) ?? [];
  } catch {
    return [];
  }
}

const DEBOUNCE_MS = 250;

/**
 * Debounced skill suggestions for a typeahead.
 *
 * One request per pause in typing, not one per keystroke, so a fast typist costs
 * one call rather than ten. A response that arrives after the query has moved on
 * is dropped — the box shows suggestions for what is in it now, never for a
 * letter already deleted. Nothing is fetched for an empty box.
 *
 * Every state change happens inside the timer, never synchronously in the
 * effect body, so a keystroke does not cascade a render before the request even
 * leaves.
 */
export function useSkillSuggestions(query: string): string[] {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const latest = useRef(0);

  useEffect(() => {
    const trimmed = query.trim();
    const ticket = ++latest.current;

    const timer = setTimeout(
      () => {
        if (ticket !== latest.current) return;
        if (trimmed === '') {
          setSuggestions([]);
          return;
        }
        void fetchSkillSuggestions(trimmed).then((names) => {
          // Only the most recent request may write: an earlier one landing late
          // must not replace newer suggestions.
          if (ticket === latest.current) setSuggestions(names);
        });
      },
      trimmed === '' ? 0 : DEBOUNCE_MS,
    );

    return () => clearTimeout(timer);
  }, [query]);

  return suggestions;
}
