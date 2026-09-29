'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';
import { LuBold, LuItalic, LuList, LuListOrdered } from 'react-icons/lu';
import { cn } from '@hireevo/ui-web';

/**
 * The markdown the editor currently holds.
 *
 * `tiptap-markdown` adds this to the editor's storage at runtime but does not
 * type it, so the shape is asserted here, in one place, rather than reaching
 * through an `any` at every call.
 */
function markdownOf(editor: Editor): string {
  return (editor.storage as { markdown: { getMarkdown: () => string } }).markdown.getMarkdown();
}

/**
 * A rich text editor for the biography that shows the formatting as it is
 * applied — bold looks bold while you type — rather than markdown with a
 * separate preview.
 *
 * What is stored is still plain markdown, not the editor's HTML: TipTap edits a
 * document and `tiptap-markdown` serialises it back to markdown on every change,
 * so the character limit counts the markdown, the value round-trips through the
 * same field it always did, and the public profile keeps rendering it through
 * the safe `Markdown` component. The editor's own set of marks is narrowed to
 * the four the toolbar offers; nothing else can be typed in, so nothing else has
 * to be stripped out.
 */
export function MarkdownEditor({
  id,
  value,
  onChange,
  maxLength,
  className,
  'aria-label': ariaLabel,
  'aria-describedby': describedBy,
  'aria-invalid': invalid,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  className?: string;
  'aria-label'?: string | undefined;
  'aria-describedby'?: string | undefined;
  'aria-invalid'?: true | undefined;
}) {
  // The markdown last accepted, so a change that would run past the limit can be
  // rolled back to it — the rich-text equivalent of a textarea's maxLength.
  const accepted = useRef(value);

  const editor = useEditor({
    // TipTap renders on the client; letting it render during SSR mismatches the
    // first paint and React warns.
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        // Only the four the toolbar offers. A heading or a code block that
        // cannot be typed is one that never has to be stripped before display.
        heading: false,
        blockquote: false,
        codeBlock: false,
        code: false,
        horizontalRule: false,
        strike: false,
      }),
      Markdown.configure({ html: false, linkify: false, transformPastedText: true }),
    ],
    content: value,
    editorProps: {
      attributes: {
        id,
        role: 'textbox',
        'aria-multiline': 'true',
        ...(ariaLabel === undefined ? {} : { 'aria-label': ariaLabel }),
        ...(describedBy === undefined ? {} : { 'aria-describedby': describedBy }),
        ...(invalid ? { 'aria-invalid': 'true' } : {}),
        class: cn(
          className,
          // Grows with its content rather than capping and scrolling: a capped,
          // scrolling contenteditable leaves its inner paragraphs overflowing
          // its box, and their rectangles then overlap the fields below it.
          'min-h-24',
          // The marks the toolbar makes, styled the way the read view styles
          // them, since Tailwind's reset strips a browser's own list styling.
          '[&_strong]:font-semibold [&_em]:italic',
          '[&_ul]:my-1 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5',
          '[&_ol]:my-1 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5',
          '[&_p]:leading-[1.7] [&>*+*]:mt-2',
        ),
      },
    },
    onUpdate: ({ editor }) => {
      const markdown = markdownOf(editor);

      if (maxLength !== undefined && markdown.length > maxLength) {
        // Past the limit: put the last accepted text back and stop, so the
        // count cannot run over what the field will store.
        editor.commands.setContent(accepted.current, false);
        return;
      }

      accepted.current = markdown;
      onChange(markdown);
    },
  });

  // A value that changed elsewhere — a draft restored on reopen — is written
  // into the editor, but only when it genuinely differs, or every keystroke
  // would re-set the document and drop the cursor.
  useEffect(() => {
    if (editor === null) return;
    const current = markdownOf(editor);
    if (current !== value) {
      accepted.current = value;
      editor.commands.setContent(value, false);
    }
  }, [editor, value]);

  return (
    <div>
      <div
        role="toolbar"
        aria-label="Text formatting"
        aria-controls={id}
        className="mb-1.5 flex flex-wrap items-center gap-1"
      >
        <ToolbarButton
          label="Bold"
          active={editor?.isActive('bold') ?? false}
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          <LuBold className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Italic"
          active={editor?.isActive('italic') ?? false}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          <LuItalic className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Bulleted list"
          active={editor?.isActive('bulletList') ?? false}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          <LuList className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Numbered list"
          active={editor?.isActive('orderedList') ?? false}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        >
          <LuListOrdered className="size-4" />
        </ToolbarButton>
      </div>

      <EditorContent editor={editor} />
    </div>
  );
}

function ToolbarButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      // The default would move focus out of the editor before the click runs,
      // and the command would then act on nothing.
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={cn(
        'flex size-8 items-center justify-center rounded-md transition-colors',
        active
          ? 'bg-surface-accent-subtle text-content-link'
          : 'text-content-muted hover:bg-surface-subtle hover:text-content-accent',
      )}
    >
      {children}
    </button>
  );
}

export type { Editor };
