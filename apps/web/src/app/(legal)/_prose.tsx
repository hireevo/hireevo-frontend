import type { ReactNode } from 'react';

/**
 * A visible, unmissable note that this is boilerplate, not reviewed legal copy.
 *
 * The pages exist so the links from sign-up and sign-in resolve and the flow is
 * complete; the words are a reasonable starting structure, not advice. This
 * banner keeps anyone from shipping them as binding terms by accident.
 */
export function TemplateNotice() {
  return (
    <div
      role="note"
      className="mb-8 rounded-lg border border-border bg-surface-warning-subtle px-4 py-3 text-sm text-content-warning"
    >
      <strong className="font-semibold">Template.</strong> This is placeholder structure for HireEvo
      to replace with copy reviewed by its legal counsel before launch. It is not legal advice and
      is not binding as written.
    </div>
  );
}

/** Consistent long-form typography for both documents. */
export function Prose({ children }: { children: ReactNode }) {
  return (
    <article className="flex flex-col gap-6 text-base leading-relaxed text-content [&_h2]:mt-4 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-content-accent [&_p]:text-content [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-2 [&_ul]:pl-6 [&_a]:text-content-link [&_a]:underline [&_a]:underline-offset-2">
      {children}
    </article>
  );
}
