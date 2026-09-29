import { toApiError, type Schema } from '@hireevo/api-client';
import { api } from '@/lib/api.ts';
import { compressImage } from './compress-image.ts';

// Derived from the batch shapes, which is what the endpoint now speaks: one
// request signs every file at once and answers with a ticket per upload. A
// single upload is the first element of a batch of one, so these read the member
// types out of the batch rather than there being a second named contract to keep
// in step (§6.1).
export type UploadTicket = Schema<'UploadBatchResponse'>['tickets'][number];
export type UploadRequest = Schema<'UploadBatchRequest'>['uploads'][number];
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
 * How many uploads this tab has in the air, and a way to watch that number.
 *
 * A save sends every list whole, so a save pressed while files are still going
 * up sends a piece without them — and, because the list is written whole,
 * clears the ones already stored. The page reads this to keep Save shut until
 * the uploads have landed, which is the only moment the lists are true.
 *
 * Module state rather than a prop threaded through four components, because the
 * question is about this tab rather than about any one editor: two zones on two
 * pieces can be uploading at once, and Save cares only that something is.
 */
let inFlight = 0;
const watching = new Set<() => void>();

export function uploadsInFlight(): number {
  return inFlight;
}

export function watchUploads(listener: () => void): () => void {
  watching.add(listener);
  return () => watching.delete(listener);
}

/** Counts one upload in and out again, telling whoever is watching. */
async function tracked<T>(run: () => Promise<Uploaded<T>>): Promise<Uploaded<T>> {
  inFlight += 1;
  for (const listener of watching) listener();
  try {
    return await run();
  } finally {
    inFlight -= 1;
    for (const listener of watching) listener();
  }
}

/**
 * Signs every upload in one request, and hands back the tickets in order.
 *
 * The one place this app talks to the upload endpoint. The bytes never go
 * through the API (ADR-004): this signs the uploads, and the browser sends each
 * file straight to the bucket afterwards. Batching the signing is the whole
 * point — attaching ten files is one request here rather than ten — so the
 * caller collects every object it is about to send and asks for all of them at
 * once. The tickets come back paired to the requests by position.
 */
async function requestTickets(requests: UploadRequest[]): Promise<Uploaded<UploadTicket[]>> {
  try {
    const { data, error } = await api.POST('/api/v1/profiles/me/uploads', {
      body: { uploads: requests },
    });
    if (data === undefined) return { ok: false, message: messageOf(error) };
    return { ok: true, value: data.tickets };
  } catch {
    return { ok: false, message: UNREACHABLE };
  }
}

/**
 * Signs one upload and sends its bytes to storage, answering with the key to
 * claim. A batch of one, for the profile photo — every other upload goes up as
 * part of a real batch.
 *
 * The key is claimed with the next save of the profile, so an upload nobody
 * finished changes nothing — it is an orphan object rather than a change to a
 * profile.
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

  const tickets = await requestTickets([request]);
  if (!tickets.ok) return tickets;

  const [ticket] = tickets.value;
  if (ticket === undefined) return { ok: false, message: REFUSED };

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
export function uploadProfilePhoto(file: File): Promise<Uploaded<string>> {
  return tracked(() => sendProfilePhoto(file));
}

async function sendProfilePhoto(file: File): Promise<Uploaded<string>> {
  // The file as it was chosen, before anything re-encodes it. A photo straight
  // off a phone would compress to well under this and pass either way, so the
  // ceiling is on what a person may hand over rather than on what is stored: a
  // deliberate product limit, and one they can act on — crop it, or export it
  // smaller — which "your photo was rejected by storage" is not.
  if (file.size > AVATAR_SOURCE_LIMIT) {
    const megabytes = Math.floor(AVATAR_SOURCE_LIMIT / 1_000_000);
    return { ok: false, message: `That photo is over ${megabytes}MB. Choose a smaller one.` };
  }
  if (file.size === 0) return { ok: false, message: 'That file is empty.' };

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

/** Which uploader a chosen file belongs to. Its own type decides. */
export type FileKind = 'image' | 'document';

/** One object to store: the request that signs it, and the bytes to send. */
interface Part {
  request: UploadRequest;
  blob: Blob;
}

/**
 * A chosen file turned into the object(s) it becomes, and how to fold the keys
 * those objects land under back into the row a save will claim.
 *
 * An image is two objects — a full copy and a thumbnail — and a document is one.
 * `parts` are in the order they are signed and sent; `toDraft` receives their
 * keys in that same order.
 */
interface Prepared {
  file: File;
  parts: Part[];
  toDraft: (keys: string[]) => DraftFile;
}

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
async function prepareImage(file: File, group: FileGroup): Promise<Uploaded<Prepared>> {
  const limits =
    group === 'portfolio'
      ? { full: LIMITS.portfolioImage, thumb: LIMITS.portfolioThumbnail }
      : { full: LIMITS.certificationImage, thumb: LIMITS.certificationThumbnail };
  const compressed = await compressImage(file, limits);
  if (!compressed.ok) return compressed;

  const { full, thumb, width, height } = compressed.image;
  // The copy this tab already holds, so the gallery fills in immediately rather
  // than after a save and a round trip.
  const thumbUrl = URL.createObjectURL(thumb);

  return {
    ok: true,
    value: {
      file,
      // The role comes from a typed lookup, so the string is a real upload role,
      // and WebP is valid for both the full and the thumbnail role of either group.
      parts: [
        {
          request: { role: ROLES[group].image, contentType: 'image/webp', byteSize: full.size },
          blob: full,
        },
        {
          request: {
            role: ROLES[group].thumbnail,
            contentType: 'image/webp',
            byteSize: thumb.size,
          },
          blob: thumb,
        },
      ],
      toDraft: (keys) => {
        const [objectKey = '', thumbKey = ''] = keys;
        return {
          kind: 'image',
          objectKey,
          thumbKey,
          contentType: 'image/webp',
          byteSize: full.size,
          width,
          height,
          fileName: file.name,
          thumbUrl,
        };
      },
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
function prepareDocument(file: File, group: FileGroup): Uploaded<Prepared> {
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

  return {
    ok: true,
    value: {
      file,
      parts: [
        {
          request: {
            role: ROLES[group].document,
            contentType: 'application/pdf',
            byteSize: file.size,
          },
          blob: file,
        },
      ],
      toDraft: (keys) => ({
        kind: 'document',
        objectKey: keys[0] ?? '',
        contentType: 'application/pdf',
        byteSize: file.size,
        fileName: file.name,
      }),
    },
  };
}

/**
 * How far a batch of attachments has got, for the one progress bar the zone shows.
 *
 * `preparing` is the compression pass that has to finish before anything can be
 * signed — an object's length is signed, so it must be known first, and twenty
 * images re-encoded is a few seconds a bar that only appeared once bytes started
 * moving would spend looking frozen. `uploading` is the bytes going up.
 */
export interface BatchProgress {
  phase: 'preparing' | 'uploading';
  /** Which file of the batch, zero-based. */
  index: number;
  total: number;
  name: string;
  size: number;
  /** 0..1 across this file's own objects; 0 while preparing. */
  fraction: number;
}

/**
 * Attaches several files in one round trip to the API.
 *
 * Every file is compressed or checked first, so every object's exact length is
 * known, and then one request signs all of them at once — the whole reason this
 * exists: ten attachments are one call to the API and one insert of ten rows,
 * not ten of each. The bytes still go up one object at a time straight to
 * storage (ADR-004): firing forty PUTs together is how a phone on a slow
 * connection times several out and reports congestion as a failure, and the
 * signing is what was batched, not the transfer. Each file is handed back the
 * moment its objects have all landed, so a batch that fails partway keeps what
 * it stored rather than a save clearing the list.
 */
export function uploadAttachments(
  chosen: readonly { file: File; kind: FileKind }[],
  group: FileGroup,
  onProgress: (progress: BatchProgress) => void,
  onLanded: (file: DraftFile) => void,
): Promise<Uploaded<void>> {
  return tracked(() => runBatch(chosen, group, onProgress, onLanded));
}

async function runBatch(
  chosen: readonly { file: File; kind: FileKind }[],
  group: FileGroup,
  onProgress: (progress: BatchProgress) => void,
  onLanded: (file: DraftFile) => void,
): Promise<Uploaded<void>> {
  const total = chosen.length;

  const prepared: Prepared[] = [];
  for (const [index, { file, kind }] of chosen.entries()) {
    onProgress({ phase: 'preparing', index, total, name: file.name, size: file.size, fraction: 0 });
    const result =
      kind === 'image' ? await prepareImage(file, group) : prepareDocument(file, group);
    if (!result.ok) return result;
    prepared.push(result.value);
  }

  // One request for every object across every file — the batch this whole
  // function exists for.
  const tickets = await requestTickets(
    prepared.flatMap((item) => item.parts.map((part) => part.request)),
  );
  if (!tickets.ok) return tickets;

  let cursor = 0;
  for (const [index, item] of prepared.entries()) {
    // An image is two objects, and the bar has to describe both as one upload.
    // Split by their real sizes rather than in half: a thumbnail is a twentieth
    // of the full image, so halving would park the bar at 50% for the whole of
    // the part that actually takes time.
    const totalBytes = item.parts.reduce((sum, part) => sum + part.blob.size, 0);
    let sentBytes = 0;
    const keys: string[] = [];

    for (const part of item.parts) {
      const ticket = tickets.value[cursor];
      cursor += 1;
      // One ticket was asked for per object, in this order, so a missing one
      // means the API answered with fewer than it was asked for — refuse rather
      // than claim a key nothing signed.
      if (ticket === undefined) return { ok: false, message: REFUSED };

      const ok = await send(ticket, part.blob, (fraction) =>
        onProgress({
          phase: 'uploading',
          index,
          total,
          name: item.file.name,
          size: item.file.size,
          fraction: (sentBytes + fraction * part.blob.size) / totalBytes,
        }),
      );
      if (!ok) return { ok: false, message: REFUSED };

      sentBytes += part.blob.size;
      keys.push(ticket.key);
    }

    // Handed up the moment its objects have landed, so a save pressed mid-batch
    // includes whatever is stored rather than clearing the list.
    onLanded(item.toDraft(keys));
  }

  return { ok: true, value: undefined };
}

/**
 * What the API will sign, mirrored here so a file is refused before it is
 * compressed rather than after.
 *
 * These are asserted against the generated contract by `upload.test.ts`, which
 * is what keeps a copy from drifting into a lie (§6.1).
 */
/**
 * The largest profile photo a person may choose.
 *
 * Separate from `LIMITS.avatar`, which is the ceiling on the re-encoded object
 * the browser sends: this one is about the file in the picker, and it is the
 * number the message quotes.
 */
export const AVATAR_SOURCE_LIMIT = 2_000_000;

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
