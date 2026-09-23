/**
 * What a section shows when its editor is closed.
 *
 * The design draws each section twice: empty, with a line of copy and a way in,
 * and filled, showing what is in it. A section that shows nothing once it has
 * something in it reads as empty, and the person fills it in twice.
 */
import { type ReactNode } from 'react';

/** "2022-02-01" as "Feb 2022". An unparseable date is shown as it was typed. */
export function monthYear(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('en', { month: 'short', year: 'numeric' });
}

/** "Feb 2022 – Present", or nothing at all when neither end is known. */
export function rangeOf(start: string, end: string): string {
  const from = start.trim() === '' ? '' : monthYear(start);
  // An end date nobody filled in means the role is still held, which is what
  // the design writes in its place.
  const to = end.trim() === '' ? (from === '' ? '' : 'Present') : monthYear(end);
  return [from, to].filter((part) => part !== '').join(' – ');
}

/** Joins the parts of a subtitle, dropping the ones that are not there. */
export const joined = (...parts: string[]) =>
  parts.filter((part) => part.trim() !== '').join(' · ');

export type SummaryRow = {
  key: string;
  primary: string;
  secondary: string;
  body?: string;
  /** Anything the row shows below its text — the portfolio's image previews. */
  media?: ReactNode;
};

export function SummaryList({ rows }: { rows: readonly SummaryRow[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((row) => (
        <li key={row.key} className="rounded-lg border border-border-subtle p-4">
          <p className="text-sm font-semibold text-content">{row.primary}</p>
          {row.secondary === '' ? null : (
            <p className="mt-0.5 text-sm text-content-subtle">{row.secondary}</p>
          )}
          {row.body === undefined || row.body.trim() === '' ? null : (
            <p className="mt-2 text-sm leading-[1.6] wrap-anywhere whitespace-pre-line text-content-muted">
              {row.body}
            </p>
          )}
          {row.media === undefined ? null : <div className="mt-3">{row.media}</div>}
        </li>
      ))}
    </ul>
  );
}

/** Skills as the design shows them: a chip each, wrapping. */
export function SkillChips({ names }: { names: readonly string[] }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {names.map((name) => (
        <li
          key={name}
          className="rounded-md bg-surface-accent-subtle px-3 py-1.5 text-[0.8125rem] text-content-accent"
        >
          {name}
        </li>
      ))}
    </ul>
  );
}
