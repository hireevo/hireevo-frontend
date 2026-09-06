import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from './cn.ts';

const button = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap',
    'font-medium transition-colors',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
    // A disabled control must still be readable — greying it into the
    // background is what makes forms unusable for low-vision users.
    'disabled:cursor-not-allowed disabled:opacity-60',
  ],
  {
    variants: {
      variant: {
        primary: 'bg-accent text-content-on-accent hover:bg-accent-hover active:bg-accent-active',
        secondary:
          'border border-border-strong bg-surface text-content hover:bg-surface-subtle active:bg-surface-muted',
        ghost: 'text-content-accent hover:bg-surface-accent-subtle active:bg-accent-muted',
        danger: 'bg-content-danger text-content-on-accent hover:opacity-90 active:opacity-80',
      },
      size: {
        sm: 'h-8 rounded-md px-3 text-sm',
        md: 'h-10 rounded-md px-4 text-base',
        lg: 'h-12 rounded-lg px-6 text-lg',
        // The primary call to action on the auth screens: 60px tall with a
        // 12px radius, both measured off the design file.
        xl: 'h-15 rounded-lg px-6 text-lg',
      },
      fullWidth: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md', fullWidth: false },
  },
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof button> & {
    /** Renders a spinner and blocks interaction without collapsing the layout. */
    loading?: boolean;
    /** Announced to screen readers while `loading` is true. */
    loadingLabel?: string;
    children?: ReactNode;
  };

export function Button({
  className,
  variant,
  size,
  fullWidth,
  loading = false,
  loadingLabel = 'Loading',
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      {...props}
      disabled={disabled === true || loading}
      aria-busy={loading || undefined}
      className={cn(button({ variant, size, fullWidth }), className)}
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
