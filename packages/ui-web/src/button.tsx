import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from './cn.ts';

const button = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap',
    'font-medium transition-colors',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
    // A disabled control must still be readable — greying it into the
    // background is what makes forms unusable for low-vision users. Both the
    // real disabled state and the aria-disabled loading state are dimmed.
    'disabled:cursor-not-allowed disabled:opacity-60',
    'aria-disabled:cursor-not-allowed aria-disabled:opacity-60',
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
        // The primary call to action on the auth screens: 60px tall, a 20px
        // radius and 20px semibold type, all read off the design file.
        xl: 'h-15 rounded-[20px] px-6 text-xl font-semibold',
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
  onClick,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      {...props}
      // A genuinely disabled button uses the attribute; a *loading* one stays
      // focusable and announces busy through aria-disabled, so a keyboard user's
      // focus is not thrown to <body> the moment they submit. Clicks are guarded
      // while loading so the action cannot fire twice.
      disabled={disabled === true}
      aria-disabled={loading || undefined}
      aria-busy={loading || undefined}
      // Only wrap a handler that was actually passed: attaching one
      // unconditionally would make a server-rendered Button (one with no
      // onClick) fail to prerender, since a server component cannot carry an
      // event handler.
      onClick={
        onClick === undefined
          ? undefined
          : (event) => {
              if (loading) {
                event.preventDefault();
                return;
              }
              onClick(event);
            }
      }
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
