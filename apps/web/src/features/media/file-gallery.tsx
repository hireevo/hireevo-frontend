'use client';

import { useState } from 'react';
import { cn } from '@hireevo/ui-web';
import { FilePreview, FileTile } from './file-preview.tsx';
import { MediaThumb } from './media-thumb.tsx';

/**
 * What every screen that reads a stored file needs from it.
 *
 * Structural rather than one of the generated response types, because the same
 * file arrives under three of them — the owner's own profile, the public one,
 * and the editor's draft — and they differ only in which screen asked.
 */
export type StoredFile = {
  kind: 'image' | 'document';
  url: string;
  thumbUrl: string | null;
  objectKey: string;
  fileName: string | null;
};

/**
 * The images of a piece or a certificate, each opening the full one.
 *
 * Every image, not a cover and a count: on the screens that use this the point
 * is to see the work — or the certificate — rather than to be told how much of
 * it there is.
 *
 * They open in the page rather than in another tab. A certificate is looked at
 * in passing, while reading the rest of the profile, and sending someone to a
 * raw object-storage URL for it costs them their place.
 */
export function FileThumbGrid({
  files,
  alt,
  className,
}: {
  files: readonly StoredFile[];
  /** What each image is called when it has no name of its own. */
  alt: string;
  className?: string;
}) {
  const [shown, setShown] = useState<StoredFile | null>(null);
  const images = files.filter((file) => file.kind === 'image');
  if (images.length === 0) return null;

  return (
    <>
      <ul className={cn('grid grid-cols-3 gap-2 *:min-w-0 sm:grid-cols-4', className)}>
        {images.map((image) => (
          <li key={image.objectKey}>
            <button
              type="button"
              onClick={() => setShown(image)}
              className="block aspect-square w-full overflow-hidden rounded-md bg-surface-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
            >
              <MediaThumb
                src={image.thumbUrl ?? image.url}
                alt={image.fileName ?? alt}
                fileName={image.fileName}
              />
              <span className="sr-only">Open {image.fileName ?? alt}</span>
            </button>
          </li>
        ))}
      </ul>

      {shown === null ? null : (
        <FilePreview file={shown} fallbackName={alt} onClose={() => setShown(null)} />
      )}
    </>
  );
}

/**
 * The documents, each opening a preview of itself.
 *
 * A PDF nobody can look at is a row of text claiming a file exists, which is
 * the sort of thing §6.7 is about: a case study that cannot be read is not
 * attached to the profile in any sense that matters.
 */
export function FileDocuments({
  files,
  fallbackName = 'Document',
  className,
}: {
  files: readonly StoredFile[];
  fallbackName?: string;
  className?: string;
}) {
  const documents = files.filter((file) => file.kind === 'document');
  if (documents.length === 0) return null;

  return (
    <ul className={cn('flex flex-col gap-1.5', className)}>
      {documents.map((document) => (
        <li key={document.objectKey}>
          <FileTile file={document} fallbackName={fallbackName} />
        </li>
      ))}
    </ul>
  );
}
