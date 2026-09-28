'use client';

import { useEffect, useRef, useState } from 'react';
import { LuImageOff } from 'react-icons/lu';
import { cn } from '@hireevo/ui-web';

/**
 * A stored image, and what to show instead when it does not arrive.
 *
 * A bare `<img>` whose source fails leaves the browser's own broken-file glyph
 * beside the raw file name — which is what a profile looked like the first time
 * object storage was unreachable for a minute: the page read as broken rather
 * than as a page whose pictures had not loaded. The fetch can fail for reasons
 * that have nothing to do with the profile being right (storage restarting, a
 * CDN edge, a phone that lost its connection between the HTML and the images),
 * so the failure is rendered deliberately: the tile keeps its shape, says what
 * the file is called, and says plainly that the preview could not be loaded.
 *
 * Not `next/image`: the source is object storage, whose host is configuration
 * rather than something the optimiser is told about at build time.
 */
export function MediaThumb({
  src,
  alt,
  fileName,
  fallback,
  className,
  imageClassName,
  width,
  height,
}: {
  /** Null when the API has no URL for this file at all, which is the same story. */
  src: string | null;
  alt: string;
  /** Named in the placeholder, so a reader still learns which file is missing. */
  fileName?: string | null;
  /**
   * What to show instead of the default placeholder. A portrait falls back to
   * the same silhouette an account with no photo shows, rather than to a tile
   * announcing a file name nobody chose to publish.
   */
  fallback?: React.ReactNode;
  className?: string;
  imageClassName?: string;
  width?: number | null;
  height?: number | null;
}) {
  const [failed, setFailed] = useState(false);
  const image = useRef<HTMLImageElement>(null);

  // `onError` only catches what fails after React is listening. On a page
  // rendered by the server the browser starts these requests while the HTML is
  // still arriving, so an image that fails early fails silently — the very case
  // this component exists for. Asking the element once, after hydration, is how
  // that one is caught: `complete` with no width means it finished and there is
  // nothing there.
  useEffect(() => {
    const node = image.current;
    if (node !== null && node.complete && node.naturalWidth === 0) setFailed(true);
  }, [src]);

  if (src === null || src === '' || failed) {
    if (fallback !== undefined) return <>{fallback}</>;

    return (
      <span
        className={cn(
          'flex size-full flex-col items-center justify-center gap-1 bg-surface-muted p-2 text-center',
          className,
        )}
      >
        <LuImageOff aria-hidden="true" className="size-5 shrink-0 text-content-subtle" />
        <span className="line-clamp-2 w-full text-xs break-words text-content-subtle">
          {fileName ?? alt}
        </span>
        {/* Said once for a screen reader, rather than on every tile's visible
            label, so a gallery of eight does not read as eight apologies. */}
        <span className="sr-only">Preview could not be loaded</span>
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={image}
      src={src}
      alt={alt}
      width={width ?? undefined}
      height={height ?? undefined}
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn('size-full object-cover', imageClassName)}
    />
  );
}
