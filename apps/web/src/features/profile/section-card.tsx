import { useId } from 'react';
import type { ReactNode } from 'react';
import { Card, IconTile, cn } from '@hireevo/ui-web';

export type SectionCardProps = {
  title: string;
  /** Renders the "(Optional)" note the design puts beside four of the headings. */
  optional?: boolean;
  description: string;
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
  className?: string | undefined;
};

export function SectionCard({
  title,
  optional = false,
  description,
  icon,
  action,
  children,
  className,
  editing = false,
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
          <p className="mt-4 max-w-[420px] text-sm leading-[1.6] text-content-subtle">
            {description}
          </p>
        </div>

        {/* The corner holds one or the other, as the design draws it: the
            control that opens the section, or — while there is none — the
            illustration. The illustration is the first thing to go when the
            column is narrow: 100px of it beside two lines of copy on a phone
            leaves room for neither. */}
        {action === null || action === undefined ? (
          <IconTile className="hidden sm:flex">{icon}</IconTile>
        ) : (
          <div className="shrink-0">{action}</div>
        )}
      </div>
      {children === undefined ? null : (
        <div className={cn('mt-6', editing && 'border-t border-border-subtle pt-6')}>
          {children}
        </div>
      )}
    </Card>
  );
}
