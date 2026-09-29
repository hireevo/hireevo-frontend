import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  uploadAttachments,
  uploadProfilePhoto,
  type BatchProgress,
  type DraftFile,
  type FileGroup,
  type FileKind,
} from './upload.ts';

const client = vi.hoisted(() => ({ GET: vi.fn(), POST: vi.fn(), PATCH: vi.fn(), PUT: vi.fn() }));
vi.mock('@/lib/api.ts', () => ({ api: client }));

/**
 * Compression is stubbed here, and exercised for real in the browser.
 *
 * Canvas encoding is not something jsdom does — `convertToBlob` and
 * `toBlob` produce nothing there — so a test that let this run would be
 * asserting against a stub of the browser rather than against a browser. What
 * these tests are about is the batched upload: what is asked of the API in the
 * one request, what is sent to storage, and what comes back to be claimed. The
 * encoder itself has no automated cover: it is exercised by driving a real
 * browser at the running API by hand, which is how the batch-append defect below
 * was found. Naming a spec file that does not exist is worse than naming none
 * (§8.1), so this says what is actually true.
 */
const compressed = vi.hoisted(() => ({ compressImage: vi.fn() }));
vi.mock('./compress-image.ts', () => compressed);

/** One signed ticket, as the API returns it inside the batch. */
const ticket = (key: string) => ({
  url: `https://nyc3.digitaloceanspaces.com/hireevo-media/${key}?X-Amz-Signature=abc`,
  headers: { 'Content-Type': 'image/webp' },
  key,
  expiresAt: '2026-09-20T10:00:00Z',
  byteSize: 1000,
});

/** The endpoint's answer: one ticket per upload, in order. */
const batch = (...keys: string[]) => ({
  data: { tickets: keys.map(ticket) },
  error: undefined,
});

const blob = (size: number, type = 'image/webp'): Blob =>
  Object.defineProperty(new Blob(['x'], { type }), 'size', { value: size });

const imageOk = (width = 2048, height = 1365) => ({
  ok: true as const,
  image: { full: blob(300_000), thumb: blob(14_000), width, height },
});

const png = (name: string): File => new File(['x'], name, { type: 'image/png' });

const pdf = (name: string, size: number): File =>
  Object.defineProperty(new File(['x'], name, { type: 'application/pdf' }), 'size', {
    value: size,
  });

/** Each PUT that reached storage: the URL it went to and the method used. */
let sent: Array<[string, RequestInit]>;

/**
 * Whether the stubbed transport should answer as storage accepting the bytes.
 *
 * Set per test rather than restubbed, because the transport is now an
 * `XMLHttpRequest` and swapping the constructor mid-test is more machinery than
 * the one refusal case is worth.
 */
let storageAccepts = true;

// Bound, because pulling a method off its object and putting it back later is
// exactly what `unbound-method` is there to catch — and these two do belong to
// `URL`.
const realCreateObjectURL = URL.createObjectURL.bind(URL);
const realRevokeObjectURL = URL.revokeObjectURL.bind(URL);

/** Runs a selection through the real batch uploader, collecting what it reports. */
async function attach(chosen: { file: File; kind: FileKind }[], group: FileGroup = 'portfolio') {
  const landed: DraftFile[] = [];
  const progress: BatchProgress[] = [];
  const result = await uploadAttachments(
    chosen,
    group,
    (update) => progress.push(update),
    (file) => landed.push(file),
  );
  return { result, landed, progress };
}

/** The role of each upload in the one request the batch sent. */
function rolesAsked(): string[] {
  const body = client.POST.mock.calls[0]?.[1] as { body: { uploads: { role: string }[] } };
  return body.body.uploads.map((upload) => upload.role);
}

beforeEach(() => {
  vi.clearAllMocks();
  sent = [];
  storageAccepts = true;

  // The bytes go up through `XMLHttpRequest`, for the one thing it does that
  // `fetch` does not: report progress while they are in flight. So the stub is
  // an XHR rather than a fetch — it records the request, reports a little
  // progress, and then answers.
  vi.stubGlobal(
    'XMLHttpRequest',
    class {
      status = 0;
      upload: { onprogress?: (event: ProgressEvent) => void } = {};
      onload?: () => void;
      onerror?: () => void;
      onabort?: () => void;
      ontimeout?: () => void;
      private url = '';

      open(_method: string, url: string) {
        this.url = url;
      }
      setRequestHeader() {}
      send(body: Blob) {
        sent.push([this.url, { method: 'PUT', body }]);
        this.upload.onprogress?.({
          lengthComputable: true,
          loaded: body.size / 2,
          total: body.size,
        } as ProgressEvent);
        this.status = storageAccepts ? 200 : 403;
        this.onload?.();
      }
    },
  );
  // Only these two are swapped, not the whole `URL` global: everything else
  // here still needs the real constructor.
  URL.createObjectURL = vi.fn(() => 'blob:preview-for-this-tab');
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  vi.unstubAllGlobals();
  URL.createObjectURL = realCreateObjectURL;
  URL.revokeObjectURL = realRevokeObjectURL;
});

describe('attaching a selection in one round trip', () => {
  /**
   * The reason the batch exists, and the answer to "ten attachments, ten API
   * calls?": however many files are chosen, the signing is one request.
   */
  it('signs every file and every object in a single request', async () => {
    compressed.compressImage.mockResolvedValue(imageOk());
    client.POST.mockResolvedValueOnce(
      batch(
        'profiles/p1/portfolio/a.webp',
        'profiles/p1/portfolio/a-thumb.webp',
        'profiles/p1/portfolio/b.webp',
        'profiles/p1/portfolio/b-thumb.webp',
        'profiles/p1/portfolio/c.pdf',
      ),
    );

    const { result, landed } = await attach([
      { file: png('a.png'), kind: 'image' },
      { file: png('b.png'), kind: 'image' },
      { file: pdf('c.pdf', 500_000), kind: 'document' },
    ]);

    expect(result.ok).toBe(true);
    // One call, not five: the whole point.
    expect(client.POST).toHaveBeenCalledTimes(1);
    // Every object across every file, in order, in that one request.
    expect(rolesAsked()).toEqual([
      'portfolio-image',
      'portfolio-thumbnail',
      'portfolio-image',
      'portfolio-thumbnail',
      'portfolio-document',
    ]);
    // Three files landed, five objects went to storage by PUT.
    expect(landed).toHaveLength(3);
    expect(sent).toHaveLength(5);
    expect(sent.every(([, init]) => init.method === 'PUT')).toBe(true);
  });

  /**
   * A file is added to the list the moment its own objects land, not once the
   * whole batch is done — so a save pressed mid-batch keeps what is stored.
   */
  it('hands each file up as its objects land, in order', async () => {
    compressed.compressImage.mockResolvedValue(imageOk());
    client.POST.mockResolvedValueOnce(
      batch('k/a.webp', 'k/a-thumb.webp', 'k/b.webp', 'k/b-thumb.webp'),
    );

    const { landed } = await attach([
      { file: png('first.png'), kind: 'image' },
      { file: png('second.png'), kind: 'image' },
    ]);

    expect(landed.map((file) => file.fileName)).toEqual(['first.png', 'second.png']);
    expect(landed[0]?.objectKey).toBe('k/a.webp');
    expect(landed[1]?.objectKey).toBe('k/b.webp');
  });
});

describe('uploading a portfolio image', () => {
  it('sends the bytes to storage rather than through the API, and answers with the row to claim', async () => {
    compressed.compressImage.mockResolvedValueOnce(imageOk());
    client.POST.mockResolvedValueOnce(
      batch(
        'profiles/p1/portfolio/aaaa000000000000.webp',
        'profiles/p1/portfolio/bbbb000000000000-thumb.webp',
      ),
    );

    const { result, landed } = await attach([{ file: png('checkout.png'), kind: 'image' }]);

    expect(result.ok).toBe(true);
    expect(landed[0]).toMatchObject({
      kind: 'image',
      objectKey: 'profiles/p1/portfolio/aaaa000000000000.webp',
      thumbKey: 'profiles/p1/portfolio/bbbb000000000000-thumb.webp',
      contentType: 'image/webp',
      byteSize: 300_000,
      width: 2048,
      height: 1365,
      fileName: 'checkout.png',
    });
    // The gallery shows the copy this tab holds until a save resolves a real
    // URL, so the uploaded file carries one from the moment it is chosen.
    expect(landed[0]?.thumbUrl).toMatch(/^blob:/);

    // Two objects, both by PUT, one API call for the tickets and none of the bytes.
    expect(client.POST).toHaveBeenCalledTimes(1);
    expect(sent).toHaveLength(2);
    expect(sent.every(([, init]) => init.method === 'PUT')).toBe(true);
    expect(sent[0]?.[0]).toContain('X-Amz-Signature');
  });

  /**
   * The length is signed, so the request must carry the size the blob was
   * measured at. This is the check that catches a future edit compressing once
   * and asking to sign something else.
   */
  it('declares the compressed length, not the original file’s', async () => {
    compressed.compressImage.mockResolvedValueOnce(imageOk());
    client.POST.mockResolvedValueOnce(batch('k/full.webp', 'k/thumb-thumb.webp'));

    await attach([{ file: pngSized('huge.png', 9_000_000), kind: 'image' }]);

    const body = client.POST.mock.calls[0]?.[1] as {
      body: { uploads: { role: string; byteSize: number }[] };
    };
    const [full, thumb] = body.body.uploads;
    expect(full).toMatchObject({ role: 'portfolio-image', byteSize: 300_000 });
    expect(thumb).toMatchObject({ role: 'portfolio-thumbnail', byteSize: 14_000 });
  });

  /**
   * The reason the transport is an `XMLHttpRequest` at all.
   *
   * `fetch` resolves when the whole response is in and says nothing on the way,
   * so a twelve-megabyte upload on a slow connection is a page that looks
   * frozen. The fractions have to climb and finish at 1 — a bar that stops at
   * 97% is one nobody trusts the next time.
   */
  it('reports progress as the bytes go, and finishes at 1', async () => {
    compressed.compressImage.mockResolvedValueOnce(imageOk());
    client.POST.mockResolvedValueOnce(batch('k/full.webp', 'k/thumb-thumb.webp'));

    const { progress } = await attach([{ file: png('a.png'), kind: 'image' }]);
    const uploading = progress.filter((p) => p.phase === 'uploading').map((p) => p.fraction);

    expect(uploading.length).toBeGreaterThan(0);
    expect(uploading.at(-1)).toBe(1);
    // Never backwards: an image is two objects, and the second must continue the
    // first rather than restart the bar.
    expect([...uploading].sort((a, b) => a - b)).toEqual(uploading);

    // Weighted by real size, not halved. The thumbnail is a twentieth of the
    // full image, so halving would park the bar at 50% through the part that
    // actually takes time.
    const halfway = uploading.find((fraction) => fraction > 0);
    expect(halfway).toBeLessThan(0.5);
  });

  it('stops without uploading when the image cannot be read', async () => {
    compressed.compressImage.mockResolvedValueOnce({ ok: false, message: 'That image…' });

    const { result } = await attach([{ file: png('x.heic'), kind: 'image' }]);

    expect(result).toMatchObject({ ok: false });
    expect(client.POST).not.toHaveBeenCalled();
    expect(sent).toHaveLength(0);
  });

  it('reports a refusal from storage rather than claiming a key nothing was written to', async () => {
    compressed.compressImage.mockResolvedValueOnce(imageOk());
    client.POST.mockResolvedValueOnce(batch('k/full.webp', 'k/thumb-thumb.webp'));
    storageAccepts = false;

    const { result } = await attach([{ file: png('a.png'), kind: 'image' }]);
    expect(result).toMatchObject({ ok: false });
  });
});

describe('uploading a portfolio document', () => {
  it('sends a PDF as it is, with the name a person will download it under', async () => {
    client.POST.mockResolvedValueOnce(batch('profiles/p1/portfolio/cccc000000000000.pdf'));

    const { result, landed } = await attach([
      { file: pdf('case-study.pdf', 880_000), kind: 'document' },
    ]);

    expect(result.ok).toBe(true);
    expect(landed[0]).toEqual({
      // No `thumbUrl`: a document has no thumbnail to show.
      kind: 'document',
      objectKey: 'profiles/p1/portfolio/cccc000000000000.pdf',
      contentType: 'application/pdf',
      byteSize: 880_000,
      fileName: 'case-study.pdf',
    });

    // Never compressed: rewriting a PDF in a browser risks handing back one that
    // will not open.
    expect(compressed.compressImage).not.toHaveBeenCalled();
  });

  it('refuses anything that is not a PDF before asking for a ticket', async () => {
    const notPdf = new File(['x'], 'notes.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    const { result } = await attach([{ file: notPdf, kind: 'document' }]);
    expect(result).toMatchObject({ ok: false });
    expect(client.POST).not.toHaveBeenCalled();
  });

  it('refuses one over the limit before a slow upload rather than after it', async () => {
    const { result } = await attach([{ file: pdf('huge.pdf', 11_000_000), kind: 'document' }]);
    expect(result).toMatchObject({ ok: false });
    expect(result.ok ? '' : result.message).toMatch(/10MB/);
    expect(client.POST).not.toHaveBeenCalled();
  });

  it('refuses an empty file, which is a failed export rather than a document', async () => {
    const { result } = await attach([{ file: pdf('empty.pdf', 0), kind: 'document' }]);
    expect(result).toMatchObject({ ok: false });
    expect(client.POST).not.toHaveBeenCalled();
  });
});

describe('uploading a certification', () => {
  it('asks for the certification roles, so the object lands in its own folder', async () => {
    compressed.compressImage.mockResolvedValueOnce(imageOk());
    client.POST.mockResolvedValueOnce(
      batch(
        'profiles/p1/certification/aaaa000000000000.webp',
        'profiles/p1/certification/bbbb000000000000-thumb.webp',
      ),
    );

    const { result, landed } = await attach(
      [{ file: png('diploma.png'), kind: 'image' }],
      'certification',
    );

    expect(result.ok).toBe(true);
    expect(landed[0]).toMatchObject({
      kind: 'image',
      objectKey: 'profiles/p1/certification/aaaa000000000000.webp',
    });
    expect(rolesAsked()).toEqual(['certification-image', 'certification-thumbnail']);
  });

  it('sends a certificate PDF under the certification-document role', async () => {
    client.POST.mockResolvedValueOnce(batch('profiles/p1/certification/cccc000000000000.pdf'));

    const { result, landed } = await attach(
      [{ file: pdf('license.pdf', 640_000), kind: 'document' }],
      'certification',
    );

    expect(result.ok).toBe(true);
    expect(landed[0]).toMatchObject({
      kind: 'document',
      objectKey: 'profiles/p1/certification/cccc000000000000.pdf',
    });
    expect(rolesAsked()).toEqual(['certification-document']);
  });
});

describe('uploading a profile photo', () => {
  it('uploads one object, because a photo has no gallery to thumbnail for', async () => {
    compressed.compressImage.mockResolvedValueOnce(imageOk(400, 400));
    client.POST.mockResolvedValueOnce(batch('profiles/p1/avatar/dddd000000000000.webp'));

    const result = await uploadProfilePhoto(new File(['x'], 'me.jpg', { type: 'image/jpeg' }));

    expect(result).toEqual({ ok: true, value: 'profiles/p1/avatar/dddd000000000000.webp' });
    expect(sent).toHaveLength(1);
    expect(rolesAsked()).toEqual(['avatar']);
  });

  it('refuses a photo over 2MB before compressing or uploading it', async () => {
    // The ceiling is on the file as it was chosen. Compression would bring
    // almost anything under what storage accepts, so without this a limit on
    // what someone may upload would not exist at all.
    const file = Object.defineProperty(
      new File(['x'], 'huge.jpg', { type: 'image/jpeg' }),
      'size',
      { value: 2_400_000 },
    );

    const result = await uploadProfilePhoto(file);

    expect(result).toMatchObject({ ok: false });
    expect(result.ok ? '' : result.message).toMatch(/2MB/);
    expect(compressed.compressImage).not.toHaveBeenCalled();
    expect(client.POST).not.toHaveBeenCalled();
  });
});

/** A PNG whose reported size stands in for a large original before compression. */
function pngSized(name: string, size: number): File {
  return Object.defineProperty(png(name), 'size', { value: size });
}
