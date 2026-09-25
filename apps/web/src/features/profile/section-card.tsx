import { useId } from 'react';
import type { ReactNode } from 'react';
import { Card, IconTile, cn } from '@hireevo/ui-web';

export type SectionCardProps = {
  title: string;
  /** Renders the "(Optional)" note the design puts beside four of the headings. */
  optional?: boolean;
  description: string;
  /**
   * Whether this section holds anything yet.
   *
   * The description is an instruction — "Share some details about yourself" —
   * and an instruction that has been followed is noise sitting above the
   * answer. A filled section shows what is in it instead.
   */
  filled?: boolean;
  /** The section's illustration. Decorative — `IconTile` hides it. */
  icon: ReactNode;
  /** The control that opens the section: "Add skills and expertise", or "Edit". */
  action: ReactNode;
  /** What the section holds once it holds something. */
  children?: ReactNode;
  /**
   * True while this section's editor is open. The illustration is decoration,
   * and an editor needs the width more than the card needs a star; the control
   * that closes it belongs beside the heading rather than under the copy.
   */
  editing?: boolean;
  /** Shown under the editor while it is open — the section's own Save. */
  footer?: ReactNode;
  className?: string | undefined;
};

export function SectionCard({
  title,
  optional = false,
  description,
  filled = false,
  icon,
  action,
  children,
  className,
  editing = false,
  footer,
}: SectionCardProps) {
  const headingId = useId();

  return (
    <Card aria-labelledby={headingId} className={cn('flex flex-col', className)}>
      <div className="flex items-start gap-6">
        <div className="min-w-0 flex-1">
          <h2 id={headingId} className="text-lg font-bold text-content-accent">
            {title}
            {optional ? (
              <span className="ml-2 text-sm font-normal text-content-subtle">(Optional)</span>
            ) : null}
          </h2>
          {/* The copy is held to roughly half the card in the design, so it
              wraps to two lines rather than running under the illustration. */}
          {filled ? null : (
            <p className="mt-4 max-w-[420px] text-sm leading-[1.6] text-content-subtle">
              {description}
            </p>
          )}
        </div>

        {/* The corner holds one or the other, as the design draws it: the
            control that opens the section, or — while there is none — the
            illustration. The illustration is the first thing to go when the
            column is narrow: 100px of it beside two lines of copy on a phone
            leaves room for neither.

            It goes for good once the section is filled. It decorates the
            invitation to fill one in, and beside a heading with no copy under
            it, it is a hundred pixels of height holding a gap above the
            answer. */}
        {action !== null && action !== undefined ? (
          <div className="shrink-0">{action}</div>
        ) : filled ? null : (
          <IconTile className="hidden sm:flex">{icon}</IconTile>
        )}
      </div>
      {children === undefined ? null : (
        <div
          className={cn(
            filled && !editing ? 'mt-4' : 'mt-6',
            editing && 'border-t border-border-subtle pt-6',
          )}
        >
          {children}
        </div>
      )}
      {/* Under the fields it saves, rather than above them: the button belongs
          at the end of the thing it finishes, and a person reading down the
          section arrives at it having read what it will send. */}
      {footer === undefined || !editing ? null : (
        <div className="mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-border-subtle pt-5">
          {footer}
        </div>
      )}
    </Card>
  );
}
