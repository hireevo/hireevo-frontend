import { toApiError, type Schema } from '@hireevo/api-client';
import { api } from '@/lib/api.ts';
import { compressImage } from './compress-image.ts';

export type UploadTicket = Schema<'UploadTicket'>;
export type UploadRequest = Schema<'UploadRequest'>;
export type UploadRole = UploadRequest['role'];
type Sections = NonNullable<Schema<'UpdateProfileRequest'>['sections']>;
export type PortfolioPiece = NonNullable<Sections['portfolio']>[number];
/** One attached file, exactly as the contract declares it — never re-typed. */
export type PortfolioFile = NonNullable<PortfolioPiece['files']>[number];

/**
 * An attached file as the editor holds it: what the save claims, and where the
 * gallery shows it from.
 *
 * A file that has been saved has URLs the API resolved from its keys. One
 * chosen a moment ago has none — nothing has been saved yet — so the uploader
 * fills `thumbUrl` with an object URL for the copy this tab still holds. The
 * gallery then reads one field for both cases instead of branching on whether
 * a file has been through a save.
 */
export type DraftFile = PortfolioFile & { thumbUrl?: string | null; url?: string | null };

/** The claim, without the display-only fields the API neither wants nor stores. */
export function toClaim(file: DraftFile): PortfolioFile {
  const { thumbUrl: _thumbUrl, url: _url, ...claim } = file;
  return claim;
}

/** Frees a preview this tab made. Harmless on a URL that came from the API. */
export function releasePreview(file: DraftFile): void {
  if (file.thumbUrl?.startsWith('blob:') === true) URL.revokeObjectURL(file.thumbUrl);
}

const UNREACHABLE = 'Could not reach HireEvo. Check your connection and try again.';
const REFUSED = 'The file could not be stored. Try again.';

export type Uploaded<T> = { ok: true; value: T } | { ok: false; message: string };

/**
 * Sends one blob to storage and answers with the key to claim.
 *
 * Two requests, because the bytes never go through the API (ADR-004): it signs
 * an upload, and the browser sends the file straight to the bucket. The key is
 * claimed with the next save of the profile, so an upload nobody finished
 * changes nothing — it is an orphan object rather than a change to a profile.
 */
async function put(request: UploadRequest, blob: Blob): Promise<Uploaded<string>> {
  // The contract ties the role to its content type and its own ceiling, so the
  // whole request is built by the caller and passed through rather than
  // assembled from loose arguments here — a mismatched pair would not compile.
  // What the caller cannot state in the type is that the declared length is
  // this blob's, and that is the one the signature binds.
  if (request.byteSize !== blob.size) return { ok: false, message: REFUSED };

  let ticket: UploadTicket;

  try {
    const { data, error } = await api.POST('/api/v1/profiles/me/uploads', {
      body: request,
    });
    if (data === undefined) return { ok: false, message: messageOf(error) };
    ticket = data;
  } catch {
    return { ok: false, message: UNREACHABLE };
  }

  try {
    // The signature covers the length as well as the type, so this body has to
    // be exactly the blob that was measured a moment ago. `Content-Length` is
    // deliberately not set here — a browser refuses to let a page set it and
    // fills it in from the body, which is what makes the signed length
    // describe the bytes that actually arrive.
    const response = await fetch(ticket.url, {
      method: 'PUT',
      headers: ticket.headers,
      body: blob,
    });
    if (!response.ok) return { ok: false, message: REFUSED };
  } catch {
    return { ok: false, message: REFUSED };
  }

  return { ok: true, value: ticket.key };
}

/**
 * The profile photo: re-encoded, then uploaded.
 *
 * Only the full-size copy — a photo is shown at one size, so a second object
 * for a thumbnail would be stored and never read.
 */
export async function uploadProfilePhoto(file: File): Promise<Uploaded<string>> {
  const compressed = await compressImage(file, {
    full: LIMITS.avatar,
    thumb: LIMITS.portfolioThumbnail,
  });
  if (!compressed.ok) return compressed;

  const { full } = compressed.image;
  return put({ role: 'avatar', contentType: 'image/webp', byteSize: full.size }, full);
}

/**
 * One portfolio image, as two objects and the row that will point at them.
 *
 * The thumbnail goes up alongside the full image rather than being derived
 * later: twenty full-size images is several megabytes before a visitor has
 * clicked anything, and on a phone that is the difference between a profile
 * that loads and one that is closed.
 */
export async function uploadPortfolioImage(file: File): Promise<Uploaded<DraftFile>> {
  const compressed = await compressImage(file, {
    full: LIMITS.portfolioImage,
    thumb: LIMITS.portfolioThumbnail,
  });
  if (!compressed.ok) return compressed;

  const { full, thumb, width, height } = compressed.image;

  const uploadedFull = await put(
    { role: 'portfolio-image', contentType: 'image/webp', byteSize: full.size },
    full,
  );
  if (!uploadedFull.ok) return uploadedFull;

  const uploadedThumb = await put(
    { role: 'portfolio-thumbnail', contentType: 'image/webp', byteSize: thumb.size },
    thumb,
  );
  if (!uploadedThumb.ok) return uploadedThumb;

  return {
    ok: true,
    value: {
      kind: 'image',
      objectKey: uploadedFull.value,
      thumbKey: uploadedThumb.value,
      contentType: 'image/webp',
      byteSize: full.size,
      width,
      height,
      fileName: file.name,
      // The copy this tab already holds, so the gallery fills in immediately
      // rather than after a save and a round trip.
      thumbUrl: URL.createObjectURL(thumb),
    },
  };
}

/**
 * One portfolio document, uploaded as it is.
 *
 * Not re-encoded: rewriting somebody's PDF in a browser risks handing back a
 * broken one, and a case study that will not open is worse than a large one.
 * The size limit is the whole of the bargain, and it is enforced here so the
 * person is told before a slow upload rather than after it.
 */
export async function uploadPortfolioDocument(file: File): Promise<Uploaded<DraftFile>> {
  if (file.type !== 'application/pdf') {
    return { ok: false, message: 'Attach a PDF. Export from Word or Pages if you need to.' };
  }

  if (file.size > LIMITS.portfolioDocument) {
    const megabytes = Math.floor(LIMITS.portfolioDocument / 1_000_000);
    return { ok: false, message: `That document is over ${megabytes}MB. Try a smaller file.` };
  }

  if (file.size === 0) {
    return { ok: false, message: 'That file is empty.' };
  }

  const uploaded = await put(
    { role: 'portfolio-document', contentType: 'application/pdf', byteSize: file.size },
    file,
  );
  if (!uploaded.ok) return uploaded;

  return {
    ok: true,
    value: {
      kind: 'document',
      objectKey: uploaded.value,
      contentType: 'application/pdf',
      byteSize: file.size,
      fileName: file.name,
    },
  };
}

/**
 * What the API will sign, mirrored here so a file is refused before it is
 * compressed rather than after.
 *
 * These are asserted against the generated contract by `upload.spec.ts`, which
 * is what keeps a copy from drifting into a lie (§6.1).
 */
export const LIMITS = {
  avatar: 2_000_000,
  portfolioImage: 5_000_000,
  portfolioThumbnail: 200_000,
  portfolioDocument: 10_000_000,
} as const;

/** What a person may attach to one piece, mirrored from `PORTFOLIO_FILE_LIMITS`. */
export const PIECE_LIMITS = { images: 20, documents: 5 } as const;

/** The types the file picker offers, which are the types the API will sign. */
export const ACCEPT = {
  image: 'image/png,image/jpeg,image/webp',
  document: 'application/pdf',
} as const;

function messageOf(error: unknown): string {
  const envelope = toApiError(error);
  if (envelope === null) return UNREACHABLE;
  return envelope.code === 'RATE_LIMITED'
    ? 'Too many uploads. Wait a moment and try again.'
    : envelope.message;
}
