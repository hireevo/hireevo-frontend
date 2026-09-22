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
async function put(
  request: UploadRequest,
  blob: Blob,
  onProgress?: (fraction: number) => void,
): Promise<Uploaded<string>> {
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

  const sent = await send(ticket, blob, onProgress);
  if (!sent) return { ok: false, message: REFUSED };

  return { ok: true, value: ticket.key };
}

/**
 * The bytes, with a running count of how many have left.
 *
 * `XMLHttpRequest` rather than `fetch`, for the one thing it still does better:
 * `upload.onprogress` reports bytes as they go. `fetch` resolves when the whole
 * response is in and says nothing on the way, so a twelve-megabyte PDF on a
 * slow connection is a page that looks frozen — which is exactly when somebody
 * needs to see that it is moving.
 *
 * The signature covers the length as well as the type, so the body has to be
 * the blob that was measured a moment ago. `Content-Length` is deliberately not
 * set — a browser refuses to let a page set it and fills it in from the body,
 * which is what makes the signed length describe the bytes that actually
 * arrive.
 */
function send(
  ticket: UploadTicket,
  blob: Blob,
  onProgress?: (fraction: number) => void,
): Promise<boolean> {
  return new Promise((resolve) => {
    const request = new XMLHttpRequest();
    request.open('PUT', ticket.url);
    for (const [name, value] of Object.entries(ticket.headers)) {
      request.setRequestHeader(name, value);
    }

    if (onProgress !== undefined) {
      request.upload.onprogress = (event) => {
        // `lengthComputable` is false where the browser cannot tell — the bar
        // stays where it was rather than jumping to a number nobody measured.
        if (event.lengthComputable && event.total > 0) {
          onProgress(Math.min(1, event.loaded / event.total));
        }
      };
    }

    request.onload = () => {
      const ok = request.status >= 200 && request.status < 300;
      // Storage answered, so whatever it accepted is all of it.
      if (ok) onProgress?.(1);
      resolve(ok);
    };
    request.onerror = () => resolve(false);
    request.onabort = () => resolve(false);
    request.ontimeout = () => resolve(false);

    request.send(blob);
  });
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
 * Which section a file is being attached to.
 *
 * A portfolio piece and a certification carry files the same way and to the
 * same ceilings, and differ only in the upload role — and so the storage folder
 * — the object lands in. One set of functions serves both, told apart by this.
 */
export type FileGroup = 'portfolio' | 'certification';

/**
 * The upload role each group uses for each kind of object.
 *
 * A key issued under a certification role lands in a different folder from a
 * portfolio one, so the API's ownership check refuses a key claimed on the
 * wrong section even when the caller really owns it (see `claimKey` server side).
 */
const ROLES = {
  portfolio: {
    image: 'portfolio-image',
    thumbnail: 'portfolio-thumbnail',
    document: 'portfolio-document',
  },
  certification: {
    image: 'certification-image',
    thumbnail: 'certification-thumbnail',
    document: 'certification-document',
  },
} as const satisfies Record<
  FileGroup,
  { image: UploadRole; thumbnail: UploadRole; document: UploadRole }
>;

/**
 * One image, as two objects and the row that will point at them.
 *
 * The thumbnail goes up alongside the full image rather than being derived
 * later: twenty full-size images is several megabytes before a visitor has
 * clicked anything, and on a phone that is the difference between a profile
 * that loads and one that is closed. `group` picks the section the object is
 * stored for; the compression and the shape are identical for both, to the same
 * ceilings the API signs.
 */
export async function uploadImage(
  file: File,
  group: FileGroup,
  onProgress?: (fraction: number) => void,
): Promise<Uploaded<DraftFile>> {
  const limits =
    group === 'portfolio'
      ? { full: LIMITS.portfolioImage, thumb: LIMITS.portfolioThumbnail }
      : { full: LIMITS.certificationImage, thumb: LIMITS.certificationThumbnail };
  const compressed = await compressImage(file, limits);
  if (!compressed.ok) return compressed;

  const { full, thumb, width, height } = compressed.image;

  // An image is two objects, and the bar has to describe both as one upload.
  // Split by their real sizes rather than in half: a thumbnail is a twentieth
  // of the full image, so halving it would park the bar at 50% for the whole of
  // the part that actually takes time.
  const total = full.size + thumb.size;
  const report = (done: number, fraction: number) => onProgress?.((done + fraction) / total);

  // The role comes from a typed lookup, so the string is a real upload role,
  // and WebP is valid for both the full and the thumbnail role of either group.
  const uploadedFull = await put(
    { role: ROLES[group].image, contentType: 'image/webp', byteSize: full.size },
    full,
    (fraction) => report(0, fraction * full.size),
  );
  if (!uploadedFull.ok) return uploadedFull;

  const uploadedThumb = await put(
    { role: ROLES[group].thumbnail, contentType: 'image/webp', byteSize: thumb.size },
    thumb,
    (fraction) => report(full.size, fraction * thumb.size),
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
 * One document, uploaded as it is.
 *
 * Not re-encoded: rewriting somebody's PDF in a browser risks handing back a
 * broken one, and a document that will not open is worse than a large one. The
 * size limit is the whole of the bargain, and it is enforced here so the person
 * is told before a slow upload rather than after it.
 */
export async function uploadDocument(
  file: File,
  group: FileGroup,
  onProgress?: (fraction: number) => void,
): Promise<Uploaded<DraftFile>> {
  if (file.type !== 'application/pdf') {
    return { ok: false, message: 'Attach a PDF. Export from Word or Pages if you need to.' };
  }

  const limit = group === 'portfolio' ? LIMITS.portfolioDocument : LIMITS.certificationDocument;
  if (file.size > limit) {
    const megabytes = Math.floor(limit / 1_000_000);
    return { ok: false, message: `That document is over ${megabytes}MB. Try a smaller file.` };
  }

  if (file.size === 0) {
    return { ok: false, message: 'That file is empty.' };
  }

  const uploaded = await put(
    { role: ROLES[group].document, contentType: 'application/pdf', byteSize: file.size },
    file,
    onProgress,
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
  certificationImage: 5_000_000,
  certificationThumbnail: 200_000,
  certificationDocument: 10_000_000,
} as const;

/**
 * What a person may attach to one piece or one certification.
 *
 * The same ceiling for both, mirrored from `PORTFOLIO_FILE_LIMITS` /
 * `LICENSE_FILE_LIMITS`, which the API keeps equal.
 */
export const FILE_LIMITS = { images: 20, documents: 5 } as const;

/** @deprecated Use {@link FILE_LIMITS}. Kept so existing imports keep resolving. */
export const PIECE_LIMITS = FILE_LIMITS;

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
