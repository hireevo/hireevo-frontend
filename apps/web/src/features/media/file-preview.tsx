'use client';

import { useState } from 'react';
import { LuExternalLink, LuFileText } from 'react-icons/lu';
import { Dialog, cn } from '@hireevo/ui-web';
import { MediaThumb } from './media-thumb.tsx';
import type { StoredFile } from './file-gallery.tsx';

/**
 * A stored file, looked at without leaving the page.
 *
 * Attaching a document used to leave a row of text claiming a PDF existed: the
 * only way to find out what had been attached was to open it in another tab and
 * come back, and on a profile with four of them nobody does that. A certificate
 * and a case study are evidence — the point of putting them on a profile is
 * that they can be looked at — so they open here, in the box, with the tab still
 * available for anyone who wants the file itself.
 *
 * The frame is safe to give a stored document because the API only ever signs
 * `application/pdf` for one and verifies the bytes against that type before the
 * object is claimed. It is also a different origin from this app, so it cannot
 * reach into this page.
 */
export function FilePreview({
  file,
  fallbackName,
  onClose,
}: {
  file: StoredFile;
  fallbackName: string;
  onClose: () => void;
}) {
  const name = file.fileName ?? fallbackName;

  return (
    <Dialog title={name} size="wide" onClose={onClose}>
      <div className="flex min-w-0 flex-col gap-4">
        {file.kind === 'image' ? (
          <span className="flex max-h-[70vh] min-h-40 items-center justify-center overflow-hidden rounded-lg bg-surface-muted">
            <MediaThumb
              src={file.url}
              alt={name}
              fileName={file.fileName}
              imageClassName="max-h-[70vh] w-auto object-contain"
            />
          </span>
        ) : (
          <DocumentFrame url={file.url} name={name} />
        )}

        <a
          href={file.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-fit items-center gap-1.5 rounded-sm text-sm text-content-link underline underline-offset-2 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          <LuExternalLink aria-hidden="true" className="size-4 shrink-0" />
          Open in a new tab
        </a>
      </div>
    </Dialog>
  );
}

/**
 * The document itself, and something to read when the browser will not show it.
 *
 * A frame that cannot render a PDF renders nothing at all — no event, no error,
 * just an empty rectangle — so the message sits behind it rather than waiting
 * for a failure to be reported. Where the frame works it covers the message;
 * where it does not, the message is what is left.
 */
function DocumentFrame({ url, name }: { url: string; name: string }) {
  return (
    <span className="relative flex h-[70vh] min-h-72 w-full overflow-hidden rounded-lg bg-surface-muted">
      <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center">
        <LuFileText aria-hidden="true" className="size-6 text-content-subtle" />
        <span className="text-sm text-content-muted">
          This browser cannot show the document here. Open it in a new tab to read it.
        </span>
      </span>
      <iframe src={url} title={name} className="relative z-10 size-full border-0" />
    </span>
  );
}

/**
 * A file as something to press: the tile a gallery or a document list shows.
 *
 * Kept here beside the box it opens so the two cannot drift — a tile that opens
 * nothing is the inert UI §6.7 is about.
 */
export function FileTile({
  file,
  fallbackName,
  className,
}: {
  file: StoredFile;
  fallbackName: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const name = file.fileName ?? fallbackName;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          // `min-h-9` rather than padding alone: a caller that puts this in a
          // row of its own may drop the padding, and a control under 24px is a
          // target nobody can hit (WCAG 2.2, §6.11).
          'flex min-h-9 w-full min-w-0 items-center gap-2.5 rounded-md border border-border-subtle px-3 py-2 text-left text-sm text-content-muted transition-colors hover:border-border hover:text-content-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
          className,
        )}
      >
        <LuFileText aria-hidden="true" className="size-4 shrink-0" />
        <span className="min-w-0 flex-1 truncate">{name}</span>
        <span className="sr-only">— open a preview</span>
      </button>

      {open ? (
        <FilePreview file={file} fallbackName={fallbackName} onClose={() => setOpen(false)} />
      ) : null}
    </>
  );
}

/**
 * The image that leads a portfolio piece.
 *
 * Its own component because the screen it sits on is rendered on the server:
 * the piece around it stays server-rendered, and only the part that has to
 * respond to a press is sent to the browser.
 */
export function FileCover({
  file,
  alt,
}: {
  file: StoredFile & { width?: number | null; height?: number | null };
  alt: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative block w-full bg-surface-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
      >
        <span className="flex aspect-[4/3] w-full overflow-hidden">
          <MediaThumb
            src={file.thumbUrl ?? file.url}
            alt={file.fileName ?? alt}
            fileName={file.fileName}
            width={file.width ?? null}
            height={file.height ?? null}
          />
        </span>
        <span className="sr-only">Open {file.fileName ?? alt}</span>
      </button>

      {open ? <FilePreview file={file} fallbackName={alt} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
