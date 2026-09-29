'use client';

import { useEffect, useId, useRef, useState } from 'react';
import type { ChangeEvent, DragEvent, ReactNode } from 'react';
import { LuCloudUpload, LuDownload, LuFileText, LuTrash2 } from 'react-icons/lu';
import {
  ACCEPT,
  FILE_LIMITS,
  releasePreview,
  uploadAttachments,
  type DraftFile,
  type FileGroup,
  type FileKind,
} from './upload.ts';
import { MediaThumb } from './media-thumb.tsx';

/**
 * Attaching images and documents to a record — a portfolio piece or a
 * certification.
 *
 * Both sections carry files the same way, so the gallery, the document list and
 * the file picker live here once and each section passes what differs: which
 * upload role its files take (`group`) and what the box is called.
 *
 * One box takes both kinds. Somebody attaching a certificate has a scan or a
 * PDF in front of them and no reason to know which of two identical-looking
 * zones the one they hold belongs in; dropping a PDF on the image zone simply
 * did nothing. The file's own type decides where it goes.
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
  label = 'Files',
}: {
  files: readonly DraftFile[];
  group: FileGroup;
  onChange: (files: DraftFile[]) => void;
  /** What the one box is called above it. */
  label?: string;
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

      <Attach
        group={group}
        imagesUsed={images.length}
        documentsUsed={documents.length}
        onAdd={attach}
        label={label}
      />
    </>
  );
}

/**
 * A file's own address, where there is one that will still work.
 *
 * A file chosen a moment ago shows from a `blob:` preview belonging to this
 * page; opening that in another tab gives an empty document, and by the next
 * visit it is gone entirely. Only an address that outlives the page is worth
 * making a link out of.
 */
function openable(file: DraftFile): string | null {
  const address = file.url ?? '';
  return address === '' || address.startsWith('blob:') ? null : address;
}

/** Wraps a thumbnail in the link that opens the file, where the file has one. */
function OpensInATab({ file, children }: { file: DraftFile; children: ReactNode }) {
  const href = openable(file);
  if (href === null) return <>{children}</>;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="block size-full focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
    >
      {children}
      <span className="sr-only">Open {file.fileName ?? 'the file'} in a new tab</span>
    </a>
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
          <OpensInATab file={image}>
            <MediaThumb
              src={image.thumbUrl ?? null}
              alt={image.fileName ?? ''}
              fileName={image.fileName ?? null}
            />
          </OpensInATab>
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
        <li key={image.objectKey} className="flex flex-col gap-1">
          <span className="block aspect-square overflow-hidden rounded-md bg-surface-muted">
            <OpensInATab file={image}>
              <MediaThumb
                src={image.thumbUrl ?? null}
                alt={image.fileName ?? ''}
                fileName={image.fileName ?? null}
              />
            </OpensInATab>
          </span>
          {/* Under the picture rather than over its corner. The whole tile
              opens the file now, and a control sitting on top of a link is
              something a thumb lands on by accident — the sweep measures it as
              an overlap for the same reason. */}
          <button
            type="button"
            onClick={() => onRemove(image.objectKey)}
            className="flex size-6 items-center justify-center self-end rounded-full text-content-subtle transition-colors hover:bg-surface-danger-subtle hover:text-content-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            <LuTrash2 aria-hidden="true" className="size-3.5" />
            <span className="sr-only">Remove image {image.fileName ?? ''}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/**
 * The name of an attached document, and the way to read it.
 *
 * In the editor the name opens the file in another tab rather than in a box
 * over the form: somebody checking what they attached wants to read it beside
 * what they are writing, not on top of it. A file this tab has only just chosen
 * has no address that outlives the page, so it is a name and nothing more —
 * a link that opens an empty tab is worse than no link.
 */
function DraftDocumentName({ file }: { file: DraftFile }) {
  const href = openable(file);
  const name = file.fileName ?? 'Document';
  const icon = <LuFileText aria-hidden="true" className="size-4 shrink-0 text-content-subtle" />;

  if (href === null) {
    return (
      <>
        {icon}
        <span className="min-w-0 flex-1 truncate text-sm text-content">{name}</span>
      </>
    );
  }

  return (
    <>
      {icon}
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="min-w-0 flex-1 truncate rounded-sm text-sm text-content hover:text-content-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        {name}
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    </>
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
          <DraftDocumentName file={document} />
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
 * Choosing files, and uploading a whole selection in one round trip.
 *
 * The signing is batched: attaching ten files is one request to the API rather
 * than ten, which is what `uploadAttachments` collapses. The bytes still go up
 * one object at a time straight to storage — firing forty PUTs together is how a
 * phone on a slow connection times several out and reports congestion as a
 * failure — and each file is added to the list the moment its objects land, so
 * the count on screen stays the truth about what has been stored.
 *
 * One zone for both kinds. Each file is routed by its own type rather than by
 * which box it was dropped on, and the two ceilings are still counted apart
 * because the API keeps them apart.
 */
function Attach({
  group,
  imagesUsed,
  documentsUsed,
  onAdd,
  label,
}: {
  group: FileGroup;
  imagesUsed: number;
  documentsUsed: number;
  onAdd: (files: DraftFile[]) => void;
  label: string;
}) {
  const inputId = useId();
  const [busy, setBusy] = useState<Busy | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [over, setOver] = useState(false);

  const imageRoom = FILE_LIMITS.images - imagesUsed;
  const documentRoom = FILE_LIMITS.documents - documentsUsed;
  // Only when neither kind has room left: a section with twenty images can
  // still take a PDF, and a zone that refuses everything because one ceiling
  // was reached reads as broken.
  const full = imageRoom <= 0 && documentRoom <= 0;
  const disabled = full || busy !== null;

  async function take(chosen: File[]) {
    if (chosen.length === 0) return;
    setError(null);

    // Sorted before anything is uploaded, so what will not fit is said once
    // rather than after the first few have gone up and the rest are silently
    // dropped.
    const taking: { file: File; kind: FileKind }[] = [];
    const refused: string[] = [];
    let imagesLeft = imageRoom;
    let documentsLeft = documentRoom;

    for (const file of chosen) {
      const kind = kindOf(file);
      if (kind === null) {
        refused.push(`${file.name} is not a type this takes`);
        continue;
      }
      if (kind === 'image' ? imagesLeft <= 0 : documentsLeft <= 0) {
        refused.push(
          kind === 'image'
            ? `only ${FILE_LIMITS.images} images fit here`
            : `only ${FILE_LIMITS.documents} PDFs fit here`,
        );
        continue;
      }
      if (kind === 'image') imagesLeft -= 1;
      else documentsLeft -= 1;
      taking.push({ file, kind });
    }

    if (refused.length > 0) {
      setError(`Not added: ${[...new Set(refused)].join('; ')}.`);
    }
    if (taking.length === 0) return;

    // One request signs the whole selection; the bytes then go up one object at
    // a time, and each file is handed to the list the moment its objects land —
    // so a save pressed mid-batch includes whatever is stored rather than
    // clearing it, because a list is saved whole.
    const result = await uploadAttachments(
      taking,
      group,
      (progress) =>
        setBusy({
          name: progress.name,
          size: progress.size,
          done: progress.index,
          total: progress.total,
          fraction: progress.fraction,
          preparing: progress.phase === 'preparing',
        }),
      (landed) => onAdd([landed]),
    );

    if (!result.ok) setError(result.message);
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

    const chosen = [...event.dataTransfer.files].filter((file) => kindOf(file) !== null);

    if (chosen.length === 0) {
      setError(`That file is not one this accepts. ${SUPPORTED_FORMATS}.`);
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
          <span className="flex size-11 items-center justify-center rounded-full border border-border-subtle bg-surface">
            {over ? (
              <LuDownload aria-hidden="true" className="size-5 text-content-accent" />
            ) : (
              <LuCloudUpload aria-hidden="true" className="size-5 text-content-accent" />
            )}
          </span>

          <span className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-content-accent">
              {over ? (
                'Drop your files here to upload'
              ) : (
                <>
                  Drag &amp; Drop or{' '}
                  <span className="underline underline-offset-2">Choose files</span> to upload
                </>
              )}
            </span>
            <span className="text-xs text-content-subtle">{SUPPORTED_FORMATS}</span>
            {/* Apart, because the API keeps the two ceilings apart: one line
                saying "4 of 25" would be a number nothing enforces. */}
            <span className="text-xs text-content-subtle">
              {imagesUsed} of {FILE_LIMITS.images} images &middot; {documentsUsed} of{' '}
              {FILE_LIMITS.documents} PDFs
            </span>
          </span>

          <input
            id={inputId}
            type="file"
            multiple
            accept={`${ACCEPT.image},${ACCEPT.document}`}
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

type Busy = {
  name: string;
  size: number;
  done: number;
  total: number;
  fraction: number;
  /** The compression pass before signing, not the bytes going up. */
  preparing: boolean;
};

/** What the zone takes, written the way the person choosing a file reads it. */
const SUPPORTED_FORMATS = 'Supported formats: JPG, PNG, WebP, PDF';

/**
 * Which uploader a chosen file belongs to, or nothing when it belongs to
 * neither. The file's own type decides, so a PDF dropped anywhere on the box is
 * signed as a document and a photo as an image.
 */
function kindOf(file: File): FileKind | null {
  if (ACCEPT.image.split(',').includes(file.type)) return 'image';
  if (ACCEPT.document.split(',').includes(file.type)) return 'document';
  return null;
}

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
  // The compression pass reports no bytes-in-flight fraction, so its bar would
  // sit at 0 and look stalled. It is quick and there is nothing to measure, so
  // it shows as an indeterminate full track rather than a number nobody trusts.
  const verb = busy.preparing ? 'Preparing' : 'Uploading';
  const stage = busy.total > 1 ? `${verb} ${busy.done + 1} of ${busy.total}…` : `${verb}…`;

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
          the upload has not stalled. While preparing there is no measured value,
          so the role carries no `aria-valuenow` and reads as busy-indeterminate. */}
      <div
        role="progressbar"
        {...(busy.preparing
          ? {}
          : { 'aria-valuenow': percent, 'aria-valuemin': 0, 'aria-valuemax': 100 })}
        aria-label={`${verb} ${busy.name}`}
        className="h-1.5 w-full overflow-hidden rounded-full bg-border-subtle"
      >
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-150"
          style={{ width: busy.preparing ? '100%' : `${percent}%` }}
        />
      </div>

      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="min-w-0 truncate text-content-subtle">{stage}</span>
        {busy.preparing ? null : (
          <span className="shrink-0 font-semibold text-content-accent">{percent}%</span>
        )}
      </div>
    </div>
  );
}

const megabytes = (bytes: number) =>
  bytes < 1_000_000
    ? `${Math.max(1, Math.round(bytes / 1000))} KB`
    : `${(bytes / 1_000_000).toFixed(1)} MB`;
