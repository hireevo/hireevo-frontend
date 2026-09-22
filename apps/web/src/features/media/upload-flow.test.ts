import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { uploadDocument, uploadImage, uploadProfilePhoto } from './upload.ts';

const client = vi.hoisted(() => ({ GET: vi.fn(), POST: vi.fn(), PATCH: vi.fn(), PUT: vi.fn() }));
vi.mock('@/lib/api.ts', () => ({ api: client }));

/**
 * Compression is stubbed here, and exercised for real in the browser.
 *
 * Canvas encoding is not something jsdom does — `convertToBlob` and
 * `toBlob` produce nothing there — so a test that let this run would be
 * asserting against a stub of the browser rather than against a browser. What
 * these tests are about is the two-request upload: what is asked of the API,
 * what is sent to storage, and what comes back to be claimed. The encoder
 * itself is covered by `e2e/tests/portfolio-upload.spec.ts`, which runs in a
 * real one.
 */
const compressed = vi.hoisted(() => ({ compressImage: vi.fn() }));
vi.mock('./compress-image.ts', () => compressed);

const ticketFor = (key: string) => ({
  data: {
    url: `https://nyc3.digitaloceanspaces.com/hireevo-media/${key}?X-Amz-Signature=abc`,
    headers: { 'Content-Type': 'image/webp' },
    key,
    expiresAt: '2026-09-20T10:00:00Z',
    byteSize: 1000,
  },
  error: undefined,
});

const blob = (size: number, type = 'image/webp'): Blob =>
  Object.defineProperty(new Blob(['x'], { type }), 'size', { value: size });

const imageOk = (width = 2048, height = 1365) => ({
  ok: true as const,
  image: { full: blob(300_000), thumb: blob(14_000), width, height },
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
  //
  // These blobs have their `size` overridden so a test can describe a 300 KB
  // image without holding 300 KB, and jsdom's own `createObjectURL` reaches
  // inside the blob it is given — which made a jsdom upgrade fail two tests
  // that are not about object URLs at all. What they assert is that a preview
  // URL is produced and handed back, which a stub answers without pinning the
  // environment's internals.
  URL.createObjectURL = vi.fn(() => 'blob:preview-for-this-tab');
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  vi.unstubAllGlobals();
  URL.createObjectURL = realCreateObjectURL;
  URL.revokeObjectURL = realRevokeObjectURL;
});

describe('uploading a portfolio image', () => {
  it('sends the bytes to storage rather than through the API, and answers with the row to claim', async () => {
    compressed.compressImage.mockResolvedValueOnce(imageOk());
    client.POST.mockResolvedValueOnce(ticketFor('profiles/p1/portfolio/aaaa000000000000.webp'));
    client.POST.mockResolvedValueOnce(
      ticketFor('profiles/p1/portfolio/bbbb000000000000-thumb.webp'),
    );

    const file = new File(['x'], 'checkout.png', { type: 'image/png' });
    const result = await uploadImage(file, 'portfolio');

    expect(result).toMatchObject({
      ok: true,
      value: {
        kind: 'image',
        objectKey: 'profiles/p1/portfolio/aaaa000000000000.webp',
        thumbKey: 'profiles/p1/portfolio/bbbb000000000000-thumb.webp',
        contentType: 'image/webp',
        byteSize: 300_000,
        width: 2048,
        height: 1365,
        fileName: 'checkout.png',
      },
    });
    // The gallery shows the copy this tab holds until a save resolves a real
    // URL, so the uploaded file carries one from the moment it is chosen.
    expect(result.ok ? result.value.thumbUrl : '').toMatch(/^blob:/);

    // Two objects, both by PUT. The API was asked for the tickets and given
    // none of the bytes.
    expect(sent).toHaveLength(2);
    expect(sent.every(([, init]) => init.method === 'PUT')).toBe(true);
    expect(sent[0]?.[0]).toContain('X-Amz-Signature');
  });

  /**
   * The length is signed, so the request must carry the blob it was measured
   * against. This is the check that catches a future edit compressing once and
   * uploading something else.
   */
  it('declares the compressed length, not the original file’s', async () => {
    compressed.compressImage.mockResolvedValueOnce(imageOk());
    client.POST.mockResolvedValueOnce(ticketFor('profiles/p1/portfolio/aaaa000000000000.webp'));
    client.POST.mockResolvedValueOnce(
      ticketFor('profiles/p1/portfolio/bbbb000000000000-thumb.webp'),
    );

    await uploadImage(
      Object.defineProperty(new File(['x'], 'huge.png', { type: 'image/png' }), 'size', {
        value: 9_000_000,
      }),
      'portfolio',
    );

    const bodies = (
      client.POST.mock.calls as Array<[string, { body: { role: string; byteSize: number } }]>
    ).map(([, options]) => options.body);
    const [full, thumb] = bodies;
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
    client.POST.mockResolvedValueOnce(ticketFor('profiles/p1/portfolio/aaaa000000000000.webp'));
    client.POST.mockResolvedValueOnce(
      ticketFor('profiles/p1/portfolio/bbbb000000000000-thumb.webp'),
    );

    const seen: number[] = [];
    await uploadImage(new File(['x'], 'a.png', { type: 'image/png' }), 'portfolio', (fraction) =>
      seen.push(fraction),
    );

    expect(seen.length).toBeGreaterThan(0);
    expect(seen.at(-1)).toBe(1);
    // Never backwards: an image is two objects, and the second must continue
    // the first rather than restart the bar.
    expect([...seen].sort((a, b) => a - b)).toEqual(seen);

    // Weighted by real size, not halved. The thumbnail is a twentieth of the
    // full image, so halving would park the bar at 50% through the part that
    // actually takes time.
    const halfway = seen.find((fraction) => fraction > 0);
    expect(halfway).toBeLessThan(0.5);
  });

  it('stops without uploading when the image cannot be read', async () => {
    compressed.compressImage.mockResolvedValueOnce({ ok: false, message: 'That image…' });

    const result = await uploadImage(
      new File(['x'], 'x.heic', { type: 'image/heic' }),
      'portfolio',
    );

    expect(result).toMatchObject({ ok: false });
    expect(client.POST).not.toHaveBeenCalled();
    expect(sent).toHaveLength(0);
  });

  it('reports a refusal from storage rather than claiming a key nothing was written to', async () => {
    compressed.compressImage.mockResolvedValueOnce(imageOk());
    client.POST.mockResolvedValueOnce(ticketFor('profiles/p1/portfolio/aaaa000000000000.webp'));
    storageAccepts = false;

    expect(
      await uploadImage(new File(['x'], 'a.png', { type: 'image/png' }), 'portfolio'),
    ).toMatchObject({ ok: false });
  });
});

describe('uploading a portfolio document', () => {
  it('sends a PDF as it is, with the name a person will download it under', async () => {
    client.POST.mockResolvedValueOnce(ticketFor('profiles/p1/portfolio/cccc000000000000.pdf'));

    const file = Object.defineProperty(
      new File(['x'], 'case-study.pdf', { type: 'application/pdf' }),
      'size',
      { value: 880_000 },
    );

    expect(await uploadDocument(file, 'portfolio')).toEqual({
      ok: true,
      // No `thumbUrl`: a document has no thumbnail to show.
      value: {
        kind: 'document',
        objectKey: 'profiles/p1/portfolio/cccc000000000000.pdf',
        contentType: 'application/pdf',
        byteSize: 880_000,
        fileName: 'case-study.pdf',
      },
    });

    // Never compressed: rewriting a PDF in a browser risks handing back one
    // that will not open.
    expect(compressed.compressImage).not.toHaveBeenCalled();
  });

  it('refuses anything that is not a PDF before asking for a ticket', async () => {
    const file = new File(['x'], 'notes.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    expect(await uploadDocument(file, 'portfolio')).toMatchObject({ ok: false });
    expect(client.POST).not.toHaveBeenCalled();
  });

  it('refuses one over the limit before a slow upload rather than after it', async () => {
    const file = Object.defineProperty(
      new File(['x'], 'huge.pdf', { type: 'application/pdf' }),
      'size',
      { value: 11_000_000 },
    );

    const result = await uploadDocument(file, 'portfolio');
    expect(result).toMatchObject({ ok: false });
    expect(result.ok ? '' : result.message).toMatch(/10MB/);
    expect(client.POST).not.toHaveBeenCalled();
  });

  it('refuses an empty file, which is a failed export rather than a document', async () => {
    const file = Object.defineProperty(
      new File([], 'empty.pdf', { type: 'application/pdf' }),
      'size',
      { value: 0 },
    );

    expect(await uploadDocument(file, 'portfolio')).toMatchObject({ ok: false });
    expect(client.POST).not.toHaveBeenCalled();
  });
});

describe('uploading a certification', () => {
  it('asks for the certification roles, so the object lands in its own folder', async () => {
    compressed.compressImage.mockResolvedValueOnce(imageOk());
    client.POST.mockResolvedValueOnce(ticketFor('profiles/p1/certification/aaaa000000000000.webp'));
    client.POST.mockResolvedValueOnce(
      ticketFor('profiles/p1/certification/bbbb000000000000-thumb.webp'),
    );

    const result = await uploadImage(
      new File(['x'], 'diploma.png', { type: 'image/png' }),
      'certification',
    );

    expect(result).toMatchObject({
      ok: true,
      value: { kind: 'image', objectKey: 'profiles/p1/certification/aaaa000000000000.webp' },
    });
    const roles = (client.POST.mock.calls as Array<[string, { body: { role: string } }]>).map(
      ([, options]) => options.body.role,
    );
    expect(roles).toEqual(['certification-image', 'certification-thumbnail']);
  });

  it('sends a certificate PDF under the certification-document role', async () => {
    client.POST.mockResolvedValueOnce(ticketFor('profiles/p1/certification/cccc000000000000.pdf'));

    const file = Object.defineProperty(
      new File(['x'], 'license.pdf', { type: 'application/pdf' }),
      'size',
      { value: 640_000 },
    );

    const result = await uploadDocument(file, 'certification');
    expect(result).toMatchObject({
      ok: true,
      value: { kind: 'document', objectKey: 'profiles/p1/certification/cccc000000000000.pdf' },
    });
    const asked = (client.POST.mock.calls as Array<[string, { body: { role: string } }]>).map(
      ([, options]) => options.body.role,
    );
    expect(asked).toEqual(['certification-document']);
  });
});

describe('uploading a profile photo', () => {
  it('uploads one object, because a photo has no gallery to thumbnail for', async () => {
    compressed.compressImage.mockResolvedValueOnce(imageOk(400, 400));
    client.POST.mockResolvedValueOnce(ticketFor('profiles/p1/avatar/dddd000000000000.webp'));

    const result = await uploadProfilePhoto(new File(['x'], 'me.jpg', { type: 'image/jpeg' }));

    expect(result).toEqual({ ok: true, value: 'profiles/p1/avatar/dddd000000000000.webp' });
    expect(sent).toHaveLength(1);
    const asked = (client.POST.mock.calls as Array<[string, { body: { role: string } }]>).map(
      ([, options]) => options.body,
    );
    expect(asked[0]).toMatchObject({ role: 'avatar' });
  });
});
