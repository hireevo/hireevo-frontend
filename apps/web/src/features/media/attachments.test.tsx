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

const pdfFor = (index: number): DraftFile => ({
  kind: 'document',
  objectKey: `profiles/p1/portfolio/${String(index).padStart(16, '0')}.pdf`,
  thumbKey: null,
  url: `https://media.test/${index}.pdf`,
  thumbUrl: null,
  contentType: 'application/pdf',
  byteSize: 900_000,
  width: null,
  height: null,
  fileName: `case-study-${index}.pdf`,
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

/**
 * One box for both kinds.
 *
 * There used to be two zones side by side, identical apart from their captions,
 * and a PDF dropped on the images one simply did nothing — no upload, no
 * message. Somebody attaching a certificate has a scan or a PDF in front of
 * them and no reason to know which half of the row it belongs in, so the file's
 * own type decides.
 */
describe('the one box that takes images and PDFs', () => {
  const chooseIn = (picker: HTMLInputElement | null, chosen: File[]) => {
    Object.defineProperty(picker, 'files', { value: chosen, configurable: true });
    picker?.dispatchEvent(new Event('change', { bubbles: true }));
  };
  const box = () => document.querySelectorAll('input[type=file]');

  it('sends each file to the uploader its own type belongs to', async () => {
    const onFiles = vi.fn<(files: DraftFile[]) => void>();
    uploads.uploadImage.mockResolvedValue({ ok: true, value: fileFor(1) });
    uploads.uploadDocument.mockResolvedValue({ ok: true, value: pdfFor(1) });

    render(<Editor onFiles={onFiles} />);

    // One picker, not one per kind.
    expect(box()).toHaveLength(1);
    const picker = document.querySelector<HTMLInputElement>('input[type=file]');
    expect(picker?.accept).toContain('image/png');
    expect(picker?.accept).toContain('application/pdf');

    chooseIn(picker, [
      new File(['x'], 'shot-1.jpg', { type: 'image/jpeg' }),
      new File(['x'], 'case-study-1.pdf', { type: 'application/pdf' }),
    ]);

    await waitFor(() => expect(uploads.uploadImage).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(uploads.uploadDocument).toHaveBeenCalledTimes(1));
    expect(uploads.uploadImage.mock.calls[0]?.[0].name).toBe('shot-1.jpg');
    expect(uploads.uploadDocument.mock.calls[0]?.[0].name).toBe('case-study-1.pdf');
    await waitFor(() => expect(onFiles.mock.calls.at(-1)?.[0]).toHaveLength(2));
  });

  it('says which files it would not take, and still takes the rest', async () => {
    const onFiles = vi.fn<(files: DraftFile[]) => void>();
    uploads.uploadImage.mockResolvedValue({ ok: true, value: fileFor(2) });

    render(<Editor onFiles={onFiles} />);

    chooseIn(document.querySelector<HTMLInputElement>('input[type=file]'), [
      new File(['x'], 'clip.mov', { type: 'video/quicktime' }),
      new File(['x'], 'shot-2.jpg', { type: 'image/jpeg' }),
    ]);

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('clip.mov'));
    await waitFor(() => expect(onFiles.mock.calls.at(-1)?.[0]).toHaveLength(1));
    expect(uploads.uploadDocument).not.toHaveBeenCalled();
  });
});
