import { PROFICIENCIES, type Proficiency } from './draft.ts';

/**
 * The chip tint for each language proficiency, darkest for the strongest.
 *
 * The level used to be spelled out beside the language ("English · Fluent").
 * Now the tint carries it — Native darkest down to Basic palest, the order the
 * brand ramp runs in — and the word moves into the chip's label, so a row of
 * languages reads at a glance rather than as a sentence. The tint is never the
 * only signal: the proficiency stays in the label for anyone who cannot tell the
 * shades apart, colour never being enough on its own.
 */
const TINTS: Record<Proficiency, string> = {
  Native: 'bg-surface-proficiency-native',
  Fluent: 'bg-surface-proficiency-fluent',
  Conversational: 'bg-surface-proficiency-conversational',
  Basic: 'bg-surface-proficiency-basic',
};

/**
 * The canonical level for a proficiency, matched case-insensitively.
 *
 * The value reaches the UI capitalised ("Fluent") in some paths and lower-cased
 * ("fluent" — the word the API stores) in others, so it is matched on case-folded
 * text and mapped back to the one spelling the rest of the UI uses.
 */
function canonical(proficiency: string | null | undefined): Proficiency | null {
  if (proficiency == null) return null;
  return PROFICIENCIES.find((level) => level.toLowerCase() === proficiency.toLowerCase()) ?? null;
}

/**
 * The tint class for a proficiency that may be absent or unrecognised.
 *
 * A language with no proficiency set keeps the neutral chip — there is no level
 * to shade — so an unfilled row does not masquerade as a graded one.
 */
export function proficiencyTint(proficiency: string | null | undefined): string {
  const level = canonical(proficiency);
  return level === null ? 'bg-surface-accent-subtle' : TINTS[level];
}

/** "English" + "fluent" → "English — Fluent", for the chip's label and tooltip. */
export function proficiencyLabel(name: string, proficiency: string | null | undefined): string {
  const level = canonical(proficiency);
  return level === null ? name : `${name} — ${level}`;
}
