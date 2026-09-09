import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * `tailwind-merge` needs to know our semantic colour names, otherwise it treats
 * `bg-surface-accent` and `bg-surface` as unrelated and lets both survive a
 * merge — the caller's override silently loses to the component default.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      radius: ['sm', 'md', 'lg', 'xl', '2xl', 'full'],
    },
  },
});

export type { ClassValue };

/** Joins class names, with later Tailwind utilities overriding earlier ones. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
