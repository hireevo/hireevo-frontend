import { cva } from 'class-variance-authority';

/**
 * Button classes, in a module of their own with no client boundary: a Server
 * Component can call this to style a link as a button, which it could not do
 * through the client `Button` module.
 */
export const buttonVariants = cva(
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
        // `secondary` at container weight: the quiet "Add …" control that sits
        // inside a card rather than beside a primary action, so its edge must
        // not compete with the card's own.
        outline:
          'border border-border-subtle bg-surface text-content-accent hover:border-border hover:bg-surface-subtle active:bg-surface-muted',
        ghost: 'text-content-accent hover:bg-surface-accent-subtle active:bg-accent-muted',
        danger: 'bg-content-danger text-content-on-accent hover:opacity-90 active:opacity-80',
      },
      size: {
        sm: 'h-8 rounded-md px-3 text-sm',
        md: 'h-10 rounded-md px-4 text-base',
        lg: 'h-12 rounded-lg px-6 text-lg',
        // The primary call to action on the auth screens: 60px tall, a 20px
        // radius and 20px semibold type, all read off the design file. A screen
        // short on height can lower it through `--button-xl-height`.
        xl: 'h-[var(--button-xl-height,3.75rem)] rounded-[20px] px-6 text-xl font-semibold',
      },
      fullWidth: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md', fullWidth: false },
  },
);
