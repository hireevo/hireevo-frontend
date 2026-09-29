/**
 * What a section shows when its editor is closed.
 *
 * The design draws each section twice: empty, with a line of copy and a way in,
 * and filled, showing what is in it. A section that shows nothing once it has
 * something in it reads as empty, and the person fills it in twice.
 */
import { type ReactNode } from 'react';
import { cn } from '@hireevo/ui-web';
import { Markdown } from '@/features/rich-text/markdown.tsx';
import {
  CONTACT_FIELDS,
  type ContactField,
  type ContactValues,
} from '@/features/profile-setup/api.ts';

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

/** "2017-06-30" as "2017". Nothing at all when the date is missing or unreadable. */
export function yearOf(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  return Number.isNaN(date.getTime()) ? '' : String(date.getFullYear());
}

/**
 * How long a role lasted, as the design writes it beside the dates: "1 yr 6 mo".
 *
 * Derived rather than stored — the two dates already say it, and a person who
 * has changed one of them should not have to change this too.
 */
export function durationOf(start: string, end: string): string {
  const from = new Date(`${start}T00:00:00`);
  const to = end.trim() === '' ? new Date() : new Date(`${end}T00:00:00`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to < from) return '';

  const months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return [years === 0 ? '' : `${years} yr`, rest === 0 ? '' : `${rest} mo`]
    .filter((part) => part !== '')
    .join(' ');
}

/** Joins the parts of a subtitle, dropping the ones that are not there. */
export const joined = (...parts: string[]) =>
  parts.filter((part) => part.trim() !== '').join(' · ');

export type SummaryRow = {
  key: string;
  primary: string;
  secondary: string;
  /**
   * The line under the subtitle — where a degree names its school and then the
   * year it finished, which is two facts rather than one run-on line.
   */
  tertiary?: string;
  /**
   * Draws the subtitle as the place rather than as a detail: a school, an
   * employer. The design gives those the link colour without making them links,
   * the same way the published profile does.
   */
  accentSecondary?: boolean;
  /** A mark before the title — the tick the design puts beside a certificate. */
  icon?: ReactNode;
  body?: string;
  /** Render `body` as the biography's small markdown set rather than plain text. */
  bodyMarkdown?: boolean;
  /** Anything the row shows below its text — the portfolio's image previews. */
  media?: ReactNode;
};

export function SummaryList({
  rows,
  variant = 'boxed',
}: {
  rows: readonly SummaryRow[];
  /**
   * How the rows are separated. The design boxes a role, because it carries a
   * paragraph and needs an edge to hold it; it rules between certificates,
   * which are two lines each and look like a form in boxes.
   */
  variant?: 'boxed' | 'ruled';
}) {
  const ruled = variant === 'ruled';

  return (
    <ul className={cn('flex flex-col', ruled ? 'gap-0' : 'gap-3')}>
      {rows.map((row, index) => (
        <li
          key={row.key}
          className={cn(
            'flex gap-3',
            ruled
              ? index === 0
                ? ''
                : 'mt-4 border-t border-border-subtle pt-4'
              : 'rounded-lg border border-border-subtle bg-surface-subtle p-4',
          )}
        >
          {row.icon === undefined ? null : (
            <span aria-hidden="true" className="mt-0.5 shrink-0 text-content-link">
              {row.icon}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-content">{row.primary}</p>
            {row.secondary === '' ? null : (
              <p
                className={cn(
                  'mt-0.5 text-sm',
                  row.accentSecondary === true
                    ? 'font-medium text-content-link'
                    : 'text-content-subtle',
                )}
              >
                {row.secondary}
              </p>
            )}
            {row.tertiary === undefined || row.tertiary === '' ? null : (
              <p className="mt-0.5 text-sm text-content-subtle">{row.tertiary}</p>
            )}
            {row.body === undefined || row.body.trim() === '' ? null : row.bodyMarkdown ? (
              <Markdown source={row.body} className="mt-2 text-sm text-content-muted" />
            ) : (
              <p className="mt-2 text-sm leading-[1.6] wrap-anywhere whitespace-pre-line text-content-muted">
                {row.body}
              </p>
            )}
            {row.media === undefined ? null : <div className="mt-3">{row.media}</div>}
          </div>
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

/** The labels the contact card reads back, in the order the design lists them. */
const CONTACT_LABELS: Record<ContactField, string> = {
  phoneE164: 'Contact No',
  contactEmail: 'Email',
  whatsappE164: 'WhatsApp',
  linkedinUrl: 'LinkedIn',
  figmaUrl: 'Figma',
};

/**
 * The contact card when it is closed: what has been given, and nothing else.
 *
 * Read as plain text rather than as links. These are private details on the
 * owner's own editing screen, and turning a LinkedIn address into something
 * clickable there invites the one mistake worth avoiding — treating them as
 * things meant to be followed from a page.
 */
export function ContactSummary({ values }: { values: ContactValues }) {
  const given = CONTACT_FIELDS.filter((field) => values[field].trim() !== '');

  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
      {given.map((field) => (
        <div key={field} className="min-w-0">
          <dt className="text-xs text-content-subtle">{CONTACT_LABELS[field]}</dt>
          <dd className="mt-0.5 text-sm break-all text-content">{values[field]}</dd>
        </div>
      ))}
    </dl>
  );
}
