import Link from 'next/link';
import { useId } from 'react';
import { Card } from '@hireevo/ui-web';
import { StepHeader } from './step-header.tsx';
import { hrefFor, type Step } from './steps.ts';

/**
 * A section of setup that has no design yet — only Identity and story does. It
 * says so rather than showing an empty form, and it points back to the section
 * that works, where everything typed has already been saved.
 */
export function UnbuiltStep({ step }: { step: Step }) {
  const headingId = useId();

  return (
    <Card aria-labelledby={headingId} className="rounded-xl p-5 sm:p-6">
      <StepHeader
        id={headingId}
        number={step.number}
        title={step.title}
        description="This section is not available yet."
      />
      <p className="mt-5 border-t border-border-subtle pt-5 text-sm text-content-subtle">
        Everything in Identity and story is saved as you type, so nothing is lost by looking ahead.
      </p>
      <Link
        href={hrefFor('identity')}
        className="mt-4 inline-flex rounded-sm text-sm font-medium text-content-link underline underline-offset-4"
      >
        Back to Identity and story
      </Link>
    </Card>
  );
}
