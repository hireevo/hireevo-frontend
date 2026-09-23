import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AttachmentsEditor } from './attachments.tsx';
import type * as Upload from './upload.ts';
import type { DraftFile } from './upload.ts';

const uploads = vi.hoisted(() => ({
  uploadImage: vi.fn<typeof Upload.uploadImage>(),
  uploadDocument: vi.fn<typeof Upload.uploadDocument>(),
}));
vi.mock('./upload.ts', async (importOriginal) => ({
  ...(await importOriginal<typeof Upload>()),
  uploadImage: (...args: Parameters<typeof Upload.uploadImage>) => uploads.uploadImage(...args),
  uploadDocument: (...args: Parameters<typeof Upload.uploadDocument>) =>
    uploads.uploadDocument(...args),
}));

const fileFor = (index: number): DraftFile => ({
  kind: 'image',
  objectKey: `profiles/p1/portfolio/${String(index).padStart(16, '0')}.webp`,
  thumbKey: `profiles/p1/portfolio/${String(index).padStart(16, '0')}-thumb.webp`,
  url: `https://media.test/${index}.webp`,
  thumbUrl: `https://media.test/${index}-thumb.webp`,
  contentType: 'image/webp',
  byteSize: 300_000,
  width: 2048,
  height: 1365,
  fileName: `shot-${index}.jpg`,
});

/** The editor with its own state, the way every screen uses it. */
function Editor({ onFiles }: { onFiles: (files: DraftFile[]) => void }) {
  const [files, setFiles] = useState<DraftFile[]>([]);
  return (
    <AttachmentsEditor
      files={files}
      group="portfolio"
      onChange={(next) => {
        setFiles(next);
        onFiles(next);
      }}
    />
  );
}

afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
});

describe('attaching several files at once', () => {
  /**
   * Ten images used to become one.
   *
   * Each upload is awaited in turn and the result handed up as it lands, and
   * the function doing the handing was captured before the first one did — so
   * appending to the list it closed over kept only the last of the batch. The
   * symptom was a portfolio piece that showed one image after ten were chosen,
   * and, because a list is saved whole, the other nine were never stored.
   */
  it('keeps every file in the batch, not only the last one', async () => {
    const onFiles = vi.fn<(files: DraftFile[]) => void>();
    uploads.uploadImage.mockImplementation((file: File) => {
      const index = Number(/(\d+)/.exec(file.name)?.[1] ?? 0);
      return Promise.resolve({ ok: true, value: fileFor(index) });
    });

    render(<Editor onFiles={onFiles} />);

    const picker = document.querySelector<HTMLInputElement>('input[type=file][accept*="image"]');
    expect(picker).not.toBeNull();

    const chosen = Array.from(
      { length: 10 },
      (_, index) => new File(['x'], `shot-${index}.jpg`, { type: 'image/jpeg' }),
    );
    Object.defineProperty(picker, 'files', { value: chosen, configurable: true });
    picker?.dispatchEvent(new Event('change', { bubbles: true }));

    await waitFor(() => expect(uploads.uploadImage).toHaveBeenCalledTimes(10));
    await waitFor(() => expect(onFiles.mock.calls.at(-1)?.[0]).toHaveLength(10));

    // And each one exactly once: a file handed up twice would be claimed twice.
    const keys = onFiles.mock.calls.at(-1)?.[0].map((file) => file.objectKey) ?? [];
    expect(new Set(keys).size).toBe(10);
  });

  it('keeps what landed when one of the batch fails', async () => {
    const onFiles = vi.fn<(files: DraftFile[]) => void>();
    uploads.uploadImage
      .mockResolvedValueOnce({ ok: true, value: fileFor(1) })
      .mockResolvedValueOnce({ ok: false, message: 'Storage refused that file.' });

    render(<Editor onFiles={onFiles} />);

    const picker = document.querySelector<HTMLInputElement>('input[type=file][accept*="image"]');
    const chosen = [
      new File(['x'], 'shot-1.jpg', { type: 'image/jpeg' }),
      new File(['x'], 'shot-2.jpg', { type: 'image/jpeg' }),
    ];
    Object.defineProperty(picker, 'files', { value: chosen, configurable: true });
    picker?.dispatchEvent(new Event('change', { bubbles: true }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Storage refused'));
    expect(onFiles.mock.calls.at(-1)?.[0]).toHaveLength(1);
  });
});
