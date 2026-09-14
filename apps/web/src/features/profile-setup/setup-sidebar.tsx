'use client';

import Link from 'next/link';
import { useId, useState } from 'react';
import { LuChevronDown } from 'react-icons/lu';
import { Card, ProgressBar, cn } from '@hireevo/ui-web';
import { STEPS, hrefFor, type Step } from './steps.ts';

const EYEBROW = 'text-xs font-medium tracking-wide text-content-link uppercase';

export function SetupSidebar({ current }: { current: Step }) {
  const listId = useId();
  const [open, setOpen] = useState(false);

  return (
    <Card aria-label="Profile setup steps" className="rounded-xl p-5">
      <p className={EYEBROW}>Profile setup</p>
      <p className="mt-1 text-sm text-content-subtle">
        <span className="font-semibold text-content">Step {current.number}</span> of {STEPS.length}
      </p>
      <ProgressBar
        className="mt-3"
        value={(current.number / STEPS.length) * 100}
        label="Profile setup progress"
        valueText={`Step ${current.number} of ${STEPS.length}`}
      />

      {/* On a phone six steps would push the form a screen down, so the list
          folds behind a button; from `lg` it sits open beside the form. */}
      <button
        type="button"
        onClick={() => setOpen((state) => !state)}
        aria-expanded={open}
        aria-controls={listId}
        className="mt-4 flex min-h-10 w-full items-center justify-between rounded-md text-sm font-medium text-content-muted lg:hidden"
      >
        All steps
        <LuChevronDown
          aria-hidden="true"
          className={cn('size-4 transition-transform duration-fast', open && 'rotate-180')}
        />
      </button>

      <ol id={listId} className={cn('mt-2 lg:mt-5 lg:block', open ? 'block' : 'hidden')}>
        {STEPS.map((step, index) => {
          const isCurrent = step.id === current.id;
          return (
            <li key={step.id} className="relative pb-3 last:pb-0">
              {index < STEPS.length - 1 ? (
                <span
                  aria-hidden="true"
                  className="absolute top-8 bottom-0 left-4 w-px -translate-x-1/2 bg-border-subtle"
                />
              ) : null}
              <Link
                href={hrefFor(step.id)}
                {...(isCurrent ? { 'aria-current': 'step' as const } : {})}
                className="group relative flex min-h-8 items-center gap-3 rounded-md text-sm"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'flex size-8 shrink-0 items-center justify-center rounded-full bg-surface text-xs font-medium',
                    isCurrent
                      ? 'border-2 border-accent text-content-link'
                      : 'border border-border-subtle text-content-subtle',
                  )}
                >
                  {step.number}
                </span>
                <span
                  className={
                    isCurrent
                      ? 'font-medium text-content-link'
                      : 'text-content-muted transition-colors group-hover:text-content'
                  }
                >
                  {step.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
