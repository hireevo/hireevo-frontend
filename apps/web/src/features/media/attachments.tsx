'use client';

import { useId, useState } from 'react';
import type { ChangeEvent } from 'react';
import { LuFileText, LuPlus, LuTrash2 } from 'react-icons/lu';
import {
  ACCEPT,
  FILE_LIMITS,
  releasePreview,
  uploadDocument,
  uploadImage,
  type DraftFile,
  type FileGroup,
} from './upload.ts';

/**
 * Attaching images and documents to a record — a portfolio piece or a
 * certification.
 *
 * Both sections carry files the same way, so the gallery, the document list and
 * the file pickers live here once and each section passes what differs: which
 * upload role its files take (`group`) and how the picker buttons read.
 *
 * Uploading happens as each file is chosen, not when the profile is saved. The
 * bytes go straight to storage (ADR-004) and what lands in the draft is a key;
 * the save claims it. A slow upload does not block the rest of the form, and
 * closing the page mid-upload leaves an unreferenced object for the retention
 * job rather than a half-written profile.
 */
export function AttachmentsEditor({
  files,
  group,
  onChange,
  imageLabel = 'Add images',
  documentLabel = 'Add PDF',
}: {
  files: readonly DraftFile[];
  group: FileGroup;
  onChange: (files: DraftFile[]) => void;
  imageLabel?: string;
  documentLabel?: string;
}) {
  const images = files.filter((file) => file.kind === 'image');
  const documents = files.filter((file) => file.kind === 'document');

  const attach = (added: DraftFile[]) => onChange([...files, ...added]);

  const detach = (key: string) => {
    const going = files.find((file) => file.objectKey === key);
    // The object stays in storage for the retention job; what is freed here is
    // the preview blob this tab made, which nothing else will release.
    if (going !== undefined) releasePreview(going);
    onChange(files.filter((file) => file.objectKey !== key));
  };

  return (
    <>
      <Gallery images={images} onRemove={detach} />
      <Documents documents={documents} onRemove={detach} />

      <div className="flex flex-wrap gap-3 *:min-w-0">
        <Attach
          kind="image"
          group={group}
          used={images.length}
          limit={FILE_LIMITS.images}
          onAdd={attach}
          label={imageLabel}
        />
        <Attach
          kind="document"
          group={group}
          used={documents.length}
          limit={FILE_LIMITS.documents}
          onAdd={attach}
          label={documentLabel}
        />
      </div>
    </>
  );
}

/**
 * The image previews a closed record shows, so a section reads as the work — or
 * the certificate — it is rather than a count of it. `thumbUrl` is the API's for
 * a saved image and a blob for one this tab still holds — the same field either
 * way.
 */
export function FileThumbnails({ files }: { files: readonly DraftFile[] }) {
  const images = files.filter((file) => file.kind === 'image');
  if (images.length === 0) return null;

  return (
    <ul className="grid grid-cols-3 gap-2 *:min-w-0 sm:grid-cols-4 md:grid-cols-6">
      {images.map((image) => (
        <li
          key={image.objectKey}
          className="block aspect-square overflow-hidden rounded-md bg-surface-muted"
        >
          {/* Not `next/image`: the source is either object storage, whose host
              is configuration, or a blob this tab is holding. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image.thumbUrl ?? ''}
            alt={image.fileName ?? ''}
            loading="lazy"
            className="size-full object-cover"
          />
        </li>
      ))}
    </ul>
  );
}

/** How many documents a record carries — what a closed record still names. */
export function documentCount(files: readonly DraftFile[]): number {
  return files.filter((file) => file.kind === 'document').length;
}

/**
 * The thumbnails, at the size they were uploaded for.
 *
 * `thumbUrl` is the same field whether the file has been saved — where the API
 * resolved it from the stored key — or was chosen a moment ago, where the
 * uploader put an object URL for the copy this tab is holding. Lazy, because a
 * record may carry twenty of these and most are below the fold.
 */
function Gallery({ images, onRemove }: { images: DraftFile[]; onRemove: (key: string) => void }) {
  if (images.length === 0) return null;

  return (
    <ul className="grid grid-cols-3 gap-2 *:min-w-0 sm:grid-cols-4 md:grid-cols-6">
      {images.map((image) => (
        <li key={image.objectKey} className="group relative">
          <span className="block aspect-square overflow-hidden rounded-md bg-surface-muted">
            {/* Not `next/image`: the source is either object storage, whose host
                is configuration, or a blob this tab is holding. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.thumbUrl ?? ''}
              alt={image.fileName ?? ''}
              loading="lazy"
              className="size-full object-cover"
            />
          </span>
          <button
            type="button"
            onClick={() => onRemove(image.objectKey)}
            className="absolute top-1 right-1 flex size-6 items-center justify-center rounded-full bg-surface/90 text-content-subtle transition-colors hover:bg-surface-danger-subtle hover:text-content-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            <LuTrash2 aria-hidden="true" className="size-3" />
            <span className="sr-only">Remove image {image.fileName ?? ''}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function Documents({
  documents,
  onRemove,
}: {
  documents: DraftFile[];
  onRemove: (key: string) => void;
}) {
  if (documents.length === 0) return null;

  return (
    <ul className="flex flex-col gap-2">
      {documents.map((document) => (
        <li
          key={document.objectKey}
          className="flex min-w-0 items-center gap-3 rounded-md border border-border-subtle px-3 py-2"
        >
          <LuFileText aria-hidden="true" className="size-4 shrink-0 text-content-subtle" />
          <span className="min-w-0 flex-1 truncate text-sm text-content">
            {document.fileName ?? 'Document'}
          </span>
          <span className="shrink-0 text-xs text-content-subtle">
            {megabytes(document.byteSize)}
          </span>
          <button
            type="button"
            onClick={() => onRemove(document.objectKey)}
            className="flex size-7 shrink-0 items-center justify-center rounded-md text-content-subtle transition-colors hover:bg-surface-danger-subtle hover:text-content-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            <LuTrash2 aria-hidden="true" className="size-3.5" />
            <span className="sr-only">Remove document {document.fileName ?? ''}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/**
 * Choosing files, and uploading them one after another.
 *
 * Sequential rather than all at once: twenty images is forty signed uploads,
 * and firing them together is how a phone on a slow connection times several of
 * them out and reports a failure that was really congestion. Going one at a time
 * also means the count on screen is the truth about what has been stored.
 */
function Attach({
  kind,
  group,
  used,
  limit,
  onAdd,
  label,
}: {
  kind: 'image' | 'document';
  group: FileGroup;
  used: number;
  limit: number;
  onAdd: (files: DraftFile[]) => void;
  label: string;
}) {
  const inputId = useId();
  const [busy, setBusy] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const room = limit - used;
  const full = room <= 0;

  async function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const chosen = [...(event.target.files ?? [])];
    // Let the same file be chosen again after a failure: the input otherwise
    // holds the old value and picking it a second time fires nothing.
    event.target.value = '';
    if (chosen.length === 0) return;

    setError(null);

    // Told before anything is uploaded, rather than after the first few have
    // gone up and the rest are silently dropped.
    const taking = chosen.slice(0, room);
    if (chosen.length > room) {
      setError(`Only ${room} more ${kind === 'image' ? 'images' : 'documents'} fit here.`);
    }

    const stored: DraftFile[] = [];
    for (const [index, file] of taking.entries()) {
      setBusy({ done: index, total: taking.length });
      const result =
        kind === 'image' ? await uploadImage(file, group) : await uploadDocument(file, group);

      if (!result.ok) {
        setError(result.message);
        break;
      }
      stored.push(result.value);
    }

    setBusy(null);
    // Whatever did land is kept. Losing four successful uploads because the
    // fifth failed would make a flaky connection cost the whole batch.
    if (stored.length > 0) onAdd(stored);
  }

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label
        htmlFor={inputId}
        aria-disabled={full || busy !== null}
        className={`inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus ${
          full || busy !== null
            ? 'cursor-not-allowed text-content-subtle opacity-60'
            : 'cursor-pointer text-content hover:bg-surface-muted'
        }`}
      >
        <LuPlus aria-hidden="true" className="size-4" />
        <span>{label}</span>
        <span className="text-xs text-content-subtle">
          {used} of {limit}
        </span>
        <input
          id={inputId}
          type="file"
          multiple
          accept={kind === 'image' ? ACCEPT.image : ACCEPT.document}
          disabled={full || busy !== null}
          onChange={(event) => void handleChange(event)}
          className="sr-only"
        />
      </label>

      {busy === null ? null : (
        <p role="status" className="text-xs text-content-subtle">
          Uploading {busy.done + 1} of {busy.total}…
        </p>
      )}
      {error === null ? null : (
        <p role="alert" className="text-xs text-content-danger">
          {error}
        </p>
      )}
    </div>
  );
}

const megabytes = (bytes: number) =>
  bytes < 1_000_000
    ? `${Math.max(1, Math.round(bytes / 1000))} KB`
    : `${(bytes / 1_000_000).toFixed(1)} MB`;
