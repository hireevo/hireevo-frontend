import { LuFileText } from 'react-icons/lu';
import { cn } from '@hireevo/ui-web';

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
  const images = files.filter((file) => file.kind === 'image');
  if (images.length === 0) return null;

  return (
    <ul className={cn('grid grid-cols-3 gap-2 *:min-w-0 sm:grid-cols-4', className)}>
      {images.map((image) => (
        <li key={image.objectKey}>
          <a
            href={image.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block aspect-square overflow-hidden rounded-md bg-surface-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
          >
            {/* Not `next/image`: the source is object storage, whose host is
                configuration rather than something the optimiser is told about
                at build time. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.thumbUrl ?? image.url}
              alt={image.fileName ?? alt}
              loading="lazy"
              className="size-full object-cover"
            />
          </a>
        </li>
      ))}
    </ul>
  );
}

/**
 * The documents, as links that open them.
 *
 * A PDF that cannot be opened is a row of text claiming a file exists, which is
 * the sort of thing §6.7 is about: a case study nobody can read is not attached
 * to the profile in any sense that matters.
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
          <a
            href={document.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-fit max-w-full items-center gap-2 rounded-sm text-sm text-content-muted hover:text-content-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            <LuFileText aria-hidden="true" className="size-4 shrink-0" />
            <span className="truncate">{document.fileName ?? fallbackName}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
