import type { Components } from 'react-markdown';
import ReactMarkdown from 'react-markdown';
import { cn } from '@hireevo/ui-web';

/**
 * The only formatting a biography may carry.
 *
 * Bold, italics and the two kinds of list — nothing else. Headings, links,
 * images, code and raw HTML are all left out on purpose: this text is written
 * by one stranger and read by another on the public profile, so the safe set is
 * the small set. react-markdown renders to React elements rather than an HTML
 * string and does not honour embedded HTML unless a plugin turns it on, so a
 * `<script>` typed into the biography is shown as the characters, never run —
 * the allow-list below only narrows that already-safe default.
 */
const ALLOWED = ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li'] as const;

const COMPONENTS: Components = {
  // Paragraphs carry the reading rhythm the plain text had; lists get the
  // indent and markers a browser would otherwise supply through its own sheet,
  // which Tailwind's reset removes.
  p: ({ children }) => (
    <p className="leading-[1.7] wrap-anywhere whitespace-pre-line">{children}</p>
  ),
  ul: ({ children }) => <ul className="my-1 list-disc space-y-1 pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="my-1 list-decimal space-y-1 pl-5">{children}</ol>,
  li: ({ children }) => <li className="leading-[1.6]">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
};

/**
 * Renders a biography's markdown as the small, safe set of formatting above.
 *
 * The paragraphs are spaced by a flex gap on the wrapper rather than margins, so
 * a biography that is one paragraph reads the same as it did as plain text.
 */
export function Markdown({ source, className }: { source: string; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <ReactMarkdown allowedElements={[...ALLOWED]} unwrapDisallowed components={COMPONENTS}>
        {source}
      </ReactMarkdown>
    </div>
  );
}
