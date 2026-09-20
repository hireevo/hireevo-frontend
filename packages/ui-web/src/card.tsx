import type { ComponentPropsWithoutRef } from 'react';
import { cn } from './cn.ts';

export type CardProps = ComponentPropsWithoutRef<'section'>;

/**
 * The panel every composed screen is built out of.
 *
 * Its edge is `border-subtle` rather than `border`: a card divides regions of a
 * page, where an input's edge tells you where you may type. Drawing both at the
 * same weight is what makes a form look like a stack of boxes.
 */
export function Card({ className, ...props }: CardProps) {
  return (
    <section
      {...props}
      className={cn('rounded-lg border border-border-subtle bg-surface-raised p-7', className)}
    />
  );
}
