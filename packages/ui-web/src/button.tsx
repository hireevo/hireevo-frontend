'use client';

import type { VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes, MouseEvent, ReactNode } from 'react';
import { buttonVariants } from './button-variants.ts';
import { cn } from './cn.ts';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    /** Renders a spinner and blocks interaction without collapsing the layout. */
    loading?: boolean;
    /** Announced to screen readers while `loading` is true. */
    loadingLabel?: string;
    children?: ReactNode;
  };

/** Swallows a click on a loading button, including the form submission it would cause. */
function refuse(event: MouseEvent<HTMLButtonElement>) {
  event.preventDefault();
}

export function Button({
  className,
  variant,
  size,
  fullWidth,
  loading = false,
  loadingLabel = 'Loading',
  disabled,
  children,
  onClick,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      {...props}
      // Loading refuses the click rather than setting `disabled`. A disabled
      // button loses focus, so pressing Save sent keyboard and screen-reader
      // users back to the top of the page mid-request (§6.8). Refusing the
      // click also cancels a form's submission, so an Enter in a field cannot
      // send it a second time while the first is still on its way.
      disabled={disabled === true}
      aria-disabled={loading || undefined}
      aria-busy={loading || undefined}
      {...(loading ? { onClick: refuse } : onClick === undefined ? {} : { onClick })}
      className={cn(
        buttonVariants({ variant, size, fullWidth }),
        loading && 'cursor-wait',
        className,
      )}
    >
      {loading ? (
        <>
          <span
            aria-hidden="true"
            className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          />
          <span className="sr-only">{loadingLabel}</span>
        </>
      ) : null}
      {children}
    </button>
  );
}
