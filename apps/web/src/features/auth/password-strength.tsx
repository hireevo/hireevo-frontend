'use client';

/**
 * How strong a password is, 0 (empty) to 4 (strong).
 *
 * Advisory, not a gate: the actual requirement is enforced by the schema. This
 * only encourages a stronger password — length and a mix of character kinds each
 * add a step, and a symbol or real length pushes it to the top.
 */
export function passwordStrength(value: string): number {
  if (value.length === 0) return 0;
  let score = 0;
  if (value.length >= 8) score += 1;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1;
  if (/\d/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value) || value.length >= 12) score += 1;
  // Any input is at least a weak password; only truly empty scores zero.
  return Math.max(1, Math.min(4, score));
}

const LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong'] as const;

/**
 * A four-segment strength bar with a line of guidance beneath it, as the sign-up
 * design draws it. The segment count carries the meaning; a screen-reader label
 * states the strength in words so it is not colour-and-shape alone.
 */
export function PasswordStrength({ value }: { value: string }) {
  const strength = passwordStrength(value);

  return (
    <div className="mt-[calc(8px+0.08*var(--fit))] flex flex-col gap-2">
      <div className="flex gap-1.5" aria-hidden="true">
        {[0, 1, 2, 3].map((index) => (
          <span
            key={index}
            className={
              index < strength
                ? 'h-1.5 flex-1 rounded-full bg-accent transition-colors'
                : 'h-1.5 flex-1 rounded-full bg-surface-muted transition-colors'
            }
          />
        ))}
      </div>
      <p className="text-sm text-content-subtle">
        Use 8+ characters with upper and lower case and a number.
      </p>
      <span role="status" className="sr-only">
        {strength === 0 ? 'Password strength: empty' : `Password strength: ${LABELS[strength]}`}
      </span>
    </div>
  );
}
