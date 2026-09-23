'use client';

import { useEffect, useId, useRef, useState } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import { LuCloudUpload, LuDownload, LuFileText, LuTrash2 } from 'react-icons/lu';
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
  imageLabel = 'Images',
  documentLabel = 'Documents',
}: {
  files: readonly DraftFile[];
  group: FileGroup;
  onChange: (files: DraftFile[]) => void;
  imageLabel?: string;
  documentLabel?: string;
}) {
  const images = files.filter((file) => file.kind === 'image');
  const documents = files.filter((file) => file.kind === 'document');

  /**
   * The list as it stands now, not as it stood when the upload began.
   *
   * Files are handed up one at a time as each lands, and the function doing the
   * handing was captured before the first one did — so appending to the `files`
   * it closed over would keep only the last of a batch and throw the other nine
   * away. A ref is read at the moment of the call, which is the only list that
   * is true by then.
   */
  const latest = useRef<DraftFile[]>([...files]);
  useEffect(() => {
    latest.current = [...files];
  }, [files]);

  const attach = (added: DraftFile[]) => {
    const current = latest.current;
    const fresh = added.filter(
      (file) => !current.some((kept) => kept.objectKey === file.objectKey),
    );
    if (fresh.length === 0) return;
    latest.current = [...current, ...fresh];
    onChange(latest.current);
  };

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

      <div className="grid gap-3 *:min-w-0 sm:grid-cols-2">
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
  const [busy, setBusy] = useState<Busy | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [over, setOver] = useState(false);

  const room = limit - used;
  const full = room <= 0;
  const disabled = full || busy !== null;

  async function take(chosen: File[]) {
    if (chosen.length === 0) return;
    setError(null);

    // Told before anything is uploaded, rather than after the first few have
    // gone up and the rest are silently dropped.
    const taking = chosen.slice(0, room);
    if (chosen.length > room) {
      setError(`Only ${room} more ${kind === 'image' ? 'images' : 'documents'} fit here.`);
    }

    for (const [index, file] of taking.entries()) {
      setBusy({ name: file.name, size: file.size, done: index, total: taking.length, fraction: 0 });

      const progress = (fraction: number) =>
        setBusy((current) => (current === null ? null : { ...current, fraction }));

      const result =
        kind === 'image'
          ? await uploadImage(file, group, progress)
          : await uploadDocument(file, group, progress);

      if (!result.ok) {
        setError(result.message);
        break;
      }
      // Handed up as each one lands, not once the batch is done. Ten images
      // take ten uploads, and a save pressed during them used to send a piece
      // with none of them on it — which does not merely lose the ones still
      // going, it clears the ones already stored, because a list is saved
      // whole. Whatever has landed is now always in the list.
      onAdd([result.value]);
    }

    setBusy(null);
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const chosen = [...(event.target.files ?? [])];
    // Let the same file be chosen again after a failure: the input otherwise
    // holds the old value and picking it a second time fires nothing.
    event.target.value = '';
    void take(chosen);
  }

  /**
   * Only the files this zone accepts.
   *
   * A drop carries whatever was dragged, including folders and files of any
   * type — `accept` governs the picker dialog and nothing else. Filtering here
   * is what stops a dropped `.mov` from being sent up and refused by storage
   * with an error about a signature.
   */
  function handleDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    setOver(false);
    if (disabled) return;

    const wanted = (kind === 'image' ? ACCEPT.image : ACCEPT.document).split(',');
    const chosen = [...event.dataTransfer.files].filter((file) => wanted.includes(file.type));

    if (chosen.length === 0) {
      setError(`That file is not one this accepts. ${formatsFor(kind)}.`);
      return;
    }
    void take(chosen);
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-2">
      <p className="text-xs font-medium text-content-muted">{label}</p>

      {busy !== null ? (
        <Progress busy={busy} />
      ) : (
        <label
          htmlFor={inputId}
          onDragOver={(event) => {
            event.preventDefault();
            if (!disabled) setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={handleDrop}
          className={`flex min-h-[8.5rem] w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus ${
            disabled
              ? 'cursor-not-allowed border-border-subtle bg-surface-muted opacity-60'
              : over
                ? 'cursor-copy border-accent bg-surface-accent-subtle'
                : 'cursor-pointer border-border bg-surface-subtle hover:bg-surface-accent-subtle'
          }`}
        >
          <span
            className={`flex size-11 items-center justify-center rounded-full border border-border-subtle ${over ? 'bg-surface' : 'bg-surface'}`}
          >
            {over ? (
              <LuDownload aria-hidden="true" className="size-5 text-content-accent" />
            ) : (
              <LuCloudUpload aria-hidden="true" className="size-5 text-content-accent" />
            )}
          </span>

          <span className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-content-accent">
              {over ? (
                'Drop your file here to upload'
              ) : (
                <>
                  Drag &amp; Drop or{' '}
                  <span className="underline underline-offset-2">Choose file</span> to upload
                </>
              )}
            </span>
            <span className="text-xs text-content-subtle">
              {formatsFor(kind)} &middot; {used} of {limit} added
            </span>
          </span>

          <input
            id={inputId}
            type="file"
            multiple
            accept={kind === 'image' ? ACCEPT.image : ACCEPT.document}
            disabled={disabled}
            onChange={handleChange}
            className="sr-only"
          />
        </label>
      )}

      {error === null ? null : (
        <p role="alert" className="text-xs text-content-danger">
          {error}
        </p>
      )}
    </div>
  );
}

type Busy = { name: string; size: number; done: number; total: number; fraction: number };

/** What this zone takes, written the way the person choosing a file reads it. */
const formatsFor = (kind: 'image' | 'document') =>
  kind === 'image' ? 'Supported formats: JPG, PNG, WebP' : 'Supported formats: PDF';

/**
 * The file going up, and how far it has got.
 *
 * A real percentage rather than a spinner: these are multi-megabyte uploads on
 * whatever connection the person has, and the question a spinner cannot answer
 * is whether anything is still moving. The count beside it says which of a
 * batch this is, so twenty images do not look like one that restarts.
 */
function Progress({ busy }: { busy: Busy }) {
  const percent = Math.round(busy.fraction * 100);

  return (
    <div className="flex w-full min-w-0 flex-col gap-2 rounded-xl border border-border-subtle bg-surface-subtle p-4">
      <div className="flex min-w-0 items-center gap-3">
        <LuFileText aria-hidden="true" className="size-5 shrink-0 text-content-accent" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-content">{busy.name}</span>
          <span className="block text-xs text-content-subtle">{megabytes(busy.size)}</span>
        </span>
      </div>

      {/* `progressbar` rather than a styled div alone: the number is announced
          rather than only drawn, and it is the one thing on screen that says
          the upload has not stalled. */}
      <div
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Uploading ${busy.name}`}
        className="h-1.5 w-full overflow-hidden rounded-full bg-border-subtle"
      >
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-150"
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="min-w-0 truncate text-content-subtle">
          {busy.total > 1 ? `Uploading ${busy.done + 1} of ${busy.total}…` : 'Uploading…'}
        </span>
        <span className="shrink-0 font-semibold text-content-accent">{percent}%</span>
      </div>
    </div>
  );
}

const megabytes = (bytes: number) =>
  bytes < 1_000_000
    ? `${Math.max(1, Math.round(bytes / 1000))} KB`
    : `${(bytes / 1_000_000).toFixed(1)} MB`;
