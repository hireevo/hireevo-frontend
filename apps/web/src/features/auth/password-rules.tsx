'use client';

import { AiFillCheckCircle } from 'react-icons/ai';
import { PASSWORD_RULES } from './schemas.ts';

/**
 * The live checklist under the sign-up password field.
 *
 * It is a list rather than four paragraphs, and each item states whether it is
 * met in text as well as in colour — the design distinguishes them by fill
 * alone, which is the one cue a colour-blind user does not get.
 *
 * One column, as drawn, except in a window too short to hold it: four rows of
 * rules were what kept sign-up's button off a laptop screen, so there they
 * wrap side by side, each as wide as its words. Not a two-column grid: at 1024px
 * the column is 377px, a rule cannot fit in half of it, and a grid of wrapped
 * rules is as tall as the single column it replaced. Not on a phone either,
 * whose column is too narrow to put two rules on one line.
 *
 * They also drop to 14px there. At 16px the narrowest split column — 377px, at
 * a 1024px window — took four lines of rules anyway, because two of them missed
 * sharing a line by ten pixels. At 14px no arrangement needs more than three,
 * with room to spare for the pixel or two another engine's text may add.
 */
export function PasswordRules({ value }: { value: string }) {
  return (
    <ul className="mt-[calc(6px+0.1*var(--fit))] flex flex-col gap-px sm:short:flex-row sm:short:flex-wrap sm:short:gap-x-5">
      {PASSWORD_RULES.map((rule) => {
        const met = rule.test(value);
        return (
          <li
            key={rule.id}
            className="flex items-center gap-2.5 text-base leading-5 sm:short:text-sm"
          >
            {/* One fill at two opacities, as the design draws it. The label
                stays the same colour either way, so the state is never carried
                by colour alone — the text below is what says which it is. */}
            <AiFillCheckCircle
              aria-hidden="true"
              className={
                met ? 'size-4 shrink-0 text-accent-soft' : 'size-4 shrink-0 text-accent-soft/20'
              }
            />
            <span className="text-content">
              {rule.label}
              <span className="sr-only">{met ? ' — met' : ' — not met yet'}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
