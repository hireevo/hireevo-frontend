'use client';

import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { LuBold, LuItalic, LuList, LuListOrdered } from 'react-icons/lu';
import { cn } from '@hireevo/ui-web';
import { AutoGrowTextarea } from '@/features/profile-setup/auto-grow-textarea.tsx';
import { Markdown } from './markdown.tsx';
import { applyMarkdown, type MarkdownAction } from './markdown-syntax.ts';

const TOOLS: { action: MarkdownAction; label: string; icon: ReactNode }[] = [
  { action: 'bold', label: 'Bold', icon: <LuBold className="size-4" /> },
  { action: 'italic', label: 'Italic', icon: <LuItalic className="size-4" /> },
  { action: 'bulletList', label: 'Bulleted list', icon: <LuList className="size-4" /> },
  { action: 'numberedList', label: 'Numbered list', icon: <LuListOrdered className="size-4" /> },
];

/**
 * A textarea with a small formatting toolbar, editing markdown.
 *
 * The stored value is plain markdown, which is why the toolbar edits the text
 * rather than a rich document: a button wraps the selection in `**` or prefixes
 * lines with `- `, exactly what a person typing markdown by hand would write.
 * The character limit and its counter therefore count the markdown, which is
 * what is stored. Write shows the markdown; Preview renders it the way the
 * profile will, so nobody has to imagine what `**bold**` becomes.
 */
export function MarkdownEditor({
  id,
  value,
  onChange,
  maxLength,
  className,
  'aria-describedby': describedBy,
  'aria-invalid': invalid,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  className?: string;
  'aria-describedby'?: string | undefined;
  'aria-invalid'?: true | undefined;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [preview, setPreview] = useState(false);

  function apply(action: MarkdownAction) {
    const textarea = container.current?.querySelector('textarea') ?? null;
    if (textarea === null) return;

    const edit = applyMarkdown(value, textarea.selectionStart, textarea.selectionEnd, action);
    onChange(edit.value);

    // The value changes on the next render, so the selection is restored after
    // it, or the browser would put the cursor back where the old text ended.
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(edit.selectionStart, edit.selectionEnd);
    });
  }

  return (
    <div ref={container}>
      <div
        role="toolbar"
        aria-label="Text formatting"
        aria-controls={id}
        className="mb-1.5 flex flex-wrap items-center gap-1"
      >
        {TOOLS.map((tool) => (
          <button
            key={tool.action}
            type="button"
            aria-label={tool.label}
            disabled={preview}
            // The mousedown default would move focus out of the textarea before
            // the click runs, losing the selection the button is meant to act on.
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => apply(tool.action)}
            className="flex size-8 items-center justify-center rounded-md text-content-muted transition-colors hover:bg-surface-subtle hover:text-content-accent disabled:pointer-events-none disabled:opacity-40"
          >
            {tool.icon}
          </button>
        ))}
        <span aria-hidden="true" className="mx-1 h-5 w-px bg-border-subtle" />
        <button
          type="button"
          aria-pressed={preview}
          onClick={() => setPreview((on) => !on)}
          className={cn(
            'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
            preview
              ? 'bg-surface-accent-subtle text-content-link'
              : 'text-content-muted hover:bg-surface-subtle hover:text-content-accent',
          )}
        >
          {preview ? 'Write' : 'Preview'}
        </button>
      </div>

      {preview ? (
        value.trim() === '' ? (
          <p className={cn(className, 'text-content-subtle')}>Nothing to preview yet.</p>
        ) : (
          <Markdown source={value} className={cn(className, 'text-content')} />
        )
      ) : (
        <AutoGrowTextarea
          id={id}
          name="overview"
          rows={4}
          maxHeight={360}
          value={value}
          {...(maxLength === undefined ? {} : { maxLength })}
          aria-describedby={describedBy}
          {...(invalid ? { 'aria-invalid': true } : {})}
          onChange={(event) => onChange(event.target.value)}
          className={className}
        />
      )}
    </div>
  );
}
