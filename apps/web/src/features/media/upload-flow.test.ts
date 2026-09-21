import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { uploadPortfolioDocument, uploadPortfolioImage, uploadProfilePhoto } from './upload.ts';

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

let sent: Array<[string, RequestInit]>;

// Bound, because pulling a method off its object and putting it back later is
// exactly what `unbound-method` is there to catch — and these two do belong to
// `URL`.
const realCreateObjectURL = URL.createObjectURL.bind(URL);
const realRevokeObjectURL = URL.revokeObjectURL.bind(URL);

beforeEach(() => {
  vi.clearAllMocks();
  sent = [];
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string, init: RequestInit) => {
      sent.push([url, init]);
      return Promise.resolve({ ok: true });
    }),
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
    const result = await uploadPortfolioImage(file);

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

    await uploadPortfolioImage(
      Object.defineProperty(new File(['x'], 'huge.png', { type: 'image/png' }), 'size', {
        value: 9_000_000,
      }),
    );

    const bodies = (
      client.POST.mock.calls as Array<[string, { body: { role: string; byteSize: number } }]>
    ).map(([, options]) => options.body);
    const [full, thumb] = bodies;
    expect(full).toMatchObject({ role: 'portfolio-image', byteSize: 300_000 });
    expect(thumb).toMatchObject({ role: 'portfolio-thumbnail', byteSize: 14_000 });
  });

  it('stops without uploading when the image cannot be read', async () => {
    compressed.compressImage.mockResolvedValueOnce({ ok: false, message: 'That image…' });

    const result = await uploadPortfolioImage(new File(['x'], 'x.heic', { type: 'image/heic' }));

    expect(result).toMatchObject({ ok: false });
    expect(client.POST).not.toHaveBeenCalled();
    expect(sent).toHaveLength(0);
  });

  it('reports a refusal from storage rather than claiming a key nothing was written to', async () => {
    compressed.compressImage.mockResolvedValueOnce(imageOk());
    client.POST.mockResolvedValueOnce(ticketFor('profiles/p1/portfolio/aaaa000000000000.webp'));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403 }));

    expect(
      await uploadPortfolioImage(new File(['x'], 'a.png', { type: 'image/png' })),
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

    expect(await uploadPortfolioDocument(file)).toEqual({
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

    expect(await uploadPortfolioDocument(file)).toMatchObject({ ok: false });
    expect(client.POST).not.toHaveBeenCalled();
  });

  it('refuses one over the limit before a slow upload rather than after it', async () => {
    const file = Object.defineProperty(
      new File(['x'], 'huge.pdf', { type: 'application/pdf' }),
      'size',
      { value: 11_000_000 },
    );

    const result = await uploadPortfolioDocument(file);
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

    expect(await uploadPortfolioDocument(file)).toMatchObject({ ok: false });
    expect(client.POST).not.toHaveBeenCalled();
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
