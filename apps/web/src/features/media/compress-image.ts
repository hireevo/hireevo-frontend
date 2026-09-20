/**
 * Re-encoding an image in the browser, before a byte of it is uploaded.
 *
 * ## Why here rather than on a server
 *
 * Media never passes through the API (ADR-004), so the server-side alternative
 * is a worker that reads each object back out of the bucket, re-encodes it and
 * writes it again. That cannot make the *upload* smaller, and the upload is
 * most of the problem: a photo straight off a phone is six to twelve megabytes,
 * and twenty of them is a portfolio piece nobody on a mobile connection
 * finishes adding. Re-encoding first turns each of those into a few hundred
 * kilobytes, and the work happens on a device that is otherwise idle.
 *
 * None of this is a security boundary. The signed upload states an exact byte
 * count and storage refuses anything else, so a page that skipped this step
 * would simply be refused — the compression is here because it is where the
 * work is cheapest, not because anything trusts it.
 */

/** The longest edge of a stored image. Enough for a full-width gallery view. */
const FULL_EDGE = 2048;

/** The longest edge of a thumbnail — what the gallery grid actually renders. */
const THUMB_EDGE = 320;

/**
 * Where re-encoding starts, and how far it will go.
 *
 * 0.82 is the knee of the WebP quality curve: visually indistinguishable from
 * the original at arm's length, and a fraction of the size. The floor exists so
 * an image that refuses to fit does so after a bounded number of attempts
 * rather than degrading indefinitely.
 */
const QUALITY = { start: 0.82, floor: 0.5, step: 0.12 } as const;

export interface CompressedImage {
  /** The image as it will be stored. */
  full: Blob;
  /** A small copy of the same image, for the gallery grid. */
  thumb: Blob;
  /** The dimensions of `full`, which size the gallery cell before it loads. */
  width: number;
  height: number;
}

export type CompressResult = { ok: true; image: CompressedImage } | { ok: false; message: string };

export interface SizeLimits {
  /** The ceiling the stored image must come in under. */
  full: number;
  /** The ceiling the thumbnail must come in under. */
  thumb: number;
}

/**
 * Decodes, downscales and re-encodes one image.
 *
 * The decode is what fails on a file that is named like an image and is not
 * one, and on formats this browser cannot read — an iPhone HEIC in a browser
 * without HEIC support, most often — so it is reported as something a person
 * can act on rather than thrown.
 */
export async function compressImage(file: File, limits: SizeLimits): Promise<CompressResult> {
  let bitmap: ImageBitmap;

  try {
    // `from-image` applies the EXIF rotation rather than ignoring it. Without
    // it every photo taken in portrait on a phone is stored on its side, and
    // the canvas has already discarded the tag by the time anyone notices.
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    return {
      ok: false,
      message: 'That image could not be read. Try a JPEG, PNG or WebP file.',
    };
  }

  try {
    const full = await encode(bitmap, FULL_EDGE, limits.full);
    if (full === null) {
      return { ok: false, message: 'That image could not be compressed. Try a different one.' };
    }

    const thumb = await encode(bitmap, THUMB_EDGE, limits.thumb);
    if (thumb === null) {
      return { ok: false, message: 'That image could not be compressed. Try a different one.' };
    }

    return {
      ok: true,
      image: { full: full.blob, thumb: thumb.blob, ...sizeOf(bitmap, FULL_EDGE) },
    };
  } finally {
    // The decoded bitmap is uncompressed pixels — an 8000×6000 photo is around
    // 190 MB of them. Twenty of those left for the collector is a tab that dies.
    bitmap.close();
  }
}

/** The size an image becomes when its longest edge is capped. Never upscales. */
function sizeOf(bitmap: ImageBitmap, edge: number): { width: number; height: number } {
  const scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height));
  return {
    width: Math.max(1, Math.round(bitmap.width * scale)),
    height: Math.max(1, Math.round(bitmap.height * scale)),
  };
}

/**
 * Draws the bitmap at the target size and encodes it, dropping quality until it
 * fits.
 *
 * The loop is bounded by `QUALITY.floor`: an image that will not fit even there
 * is reported rather than shrunk until it is unrecognisable.
 */
async function encode(
  bitmap: ImageBitmap,
  edge: number,
  maxBytes: number,
): Promise<{ blob: Blob } | null> {
  const { width, height } = sizeOf(bitmap, edge);
  const canvas = surface(width, height);

  const context = canvas.getContext('2d');
  if (context === null) return null;

  // Without this the downscale is a nearest-neighbour sample, which on a large
  // photo is visibly worse than the same size produced by any other tool.
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(bitmap, 0, 0, width, height);

  for (let quality = QUALITY.start; quality >= QUALITY.floor; quality -= QUALITY.step) {
    const blob = await toBlob(canvas, quality);
    if (blob === null) return null;
    if (blob.size <= maxBytes) return { blob };
  }

  return null;
}

/** An `OffscreenCanvas` where there is one, and an element where there is not. */
function surface(width: number, height: number): OffscreenCanvas | HTMLCanvasElement {
  if (typeof OffscreenCanvas === 'function') return new OffscreenCanvas(width, height);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

/**
 * The two canvases encode through different methods, and neither is promised
 * to produce WebP — so the type of what comes back is checked rather than
 * assumed. A browser that quietly hands back a PNG instead would otherwise
 * upload it under a signature that says WebP, and storage would refuse it with
 * a signature error that says nothing about why.
 */
async function toBlob(
  canvas: OffscreenCanvas | HTMLCanvasElement,
  quality: number,
): Promise<Blob | null> {
  const blob =
    canvas instanceof HTMLCanvasElement
      ? await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', quality))
      : await canvas.convertToBlob({ type: 'image/webp', quality });

  return blob !== null && blob.type === 'image/webp' ? blob : null;
}

export const COMPRESSION = { FULL_EDGE, THUMB_EDGE, QUALITY } as const;
