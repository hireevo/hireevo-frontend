'use client';

import { useId, useState } from 'react';
import type { ChangeEvent, ReactNode } from 'react';
import { LuFileText, LuImages, LuPlus, LuTrash2 } from 'react-icons/lu';
import { TextField } from '@hireevo/ui-web';
import {
  ACCEPT,
  PIECE_LIMITS,
  uploadPortfolioDocument,
  uploadPortfolioImage,
  releasePreview,
  type DraftFile,
} from '@/features/media/upload.ts';
import { AddButton } from './add-button.tsx';
import type { ProfileRecord } from './draft.ts';
import { SectionCard } from './section-card.tsx';
import { SummaryList } from './section-summaries.tsx';

export type PortfolioSectionProps = {
  records: ProfileRecord[];
  onChange: (records: ProfileRecord[]) => void;
  open: boolean;
  action: ReactNode;
  className?: string;
};

/**
 * The portfolio: pieces of work, each with its own images and documents.
 *
 * It has its own editor rather than the shared record form, which could only
 * add an entry and delete it. That was survivable while a piece was three lines
 * of text; it is not once a piece carries twenty images, because attaching them
 * is something a person does *after* naming the piece, over more than one
 * sitting. So every field here edits in place.
 *
 * Uploading happens as each file is chosen, not when the profile is saved. The
 * bytes go straight to storage (ADR-004) and what lands in the draft is a key;
 * the save claims it. That means a slow upload does not block the rest of the
 * form, and closing the page mid-upload leaves an unreferenced object for the
 * retention job rather than a half-written profile.
 */
export function PortfolioSection({
  records,
  onChange,
  open,
  action,
  className,
}: PortfolioSectionProps) {
  function update(id: string, change: (record: ProfileRecord) => ProfileRecord) {
    onChange(records.map((record) => (record.id === id ? change(record) : record)));
  }

  return (
    <SectionCard
      title="Portfolio"
      optional
      description="Showcase your best work to attract potential clients."
      icon={<LuImages />}
      className={className}
      editing={open}
      action={action}
    >
      {!open ? (
        records.length === 0 ? undefined : (
          <SummaryList
            rows={records.map((record) => ({
              key: record.id,
              primary: record.fields.title ?? '',
              secondary: describe(record),
              body: record.fields.summary ?? '',
            }))}
          />
        )
      ) : (
        <div className="flex flex-col gap-4">
          {records.map((record) => (
            <Piece
              key={record.id}
              record={record}
              onChange={(change) => update(record.id, change)}
              onRemove={() => onChange(records.filter((kept) => kept.id !== record.id))}
            />
          ))}

          <AddButton
            onClick={() =>
              onChange([...records, { id: crypto.randomUUID(), fields: { title: '' }, files: [] }])
            }
          >
            Add portfolio
          </AddButton>
        </div>
      )}
    </SectionCard>
  );
}

/** What a closed section says about a piece: its link, or what it carries. */
function describe(record: ProfileRecord): string {
  const files = record.files ?? [];
  const images = files.filter((file) => file.kind === 'image').length;
  const documents = files.length - images;

  const parts = [
    record.fields.url ?? '',
    images === 0 ? '' : `${images} image${images === 1 ? '' : 's'}`,
    documents === 0 ? '' : `${documents} document${documents === 1 ? '' : 's'}`,
  ].filter((part) => part !== '');

  return parts.join(' · ');
}

function Piece({
  record,
  onChange,
  onRemove,
}: {
  record: ProfileRecord;
  onChange: (change: (record: ProfileRecord) => ProfileRecord) => void;
  onRemove: () => void;
}) {
  const files = record.files ?? [];
  const images = files.filter((file) => file.kind === 'image');
  const documents = files.filter((file) => file.kind === 'document');

  const set = (name: string, value: string) =>
    onChange((current) => ({ ...current, fields: { ...current.fields, [name]: value } }));

  const attach = (added: DraftFile[]) =>
    onChange((current) => ({ ...current, files: [...(current.files ?? []), ...added] }));

  const detach = (key: string) =>
    onChange((current) => {
      const going = (current.files ?? []).find((file) => file.objectKey === key);
      // The object stays in storage for the retention job; what is freed here
      // is the preview blob this tab made, which nothing else will release.
      if (going !== undefined) releasePreview(going);
      return { ...current, files: (current.files ?? []).filter((file) => file.objectKey !== key) };
    });

  const title = record.fields.title ?? '';

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-border-subtle p-4">
      <div className="flex items-start gap-3">
        <div className="grid min-w-0 flex-1 gap-4 sm:grid-cols-2">
          <TextField
            label="Title"
            value={title}
            placeholder="Checkout redesign"
            required
            onChange={(event) => set('title', event.target.value)}
          />
          <TextField
            label="Link"
            type="url"
            value={record.fields.url ?? ''}
            placeholder="https://"
            onChange={(event) => set('url', event.target.value)}
          />
          <TextField
            label="What it is"
            value={record.fields.summary ?? ''}
            placeholder="One line is plenty"
            className="sm:col-span-2"
            onChange={(event) => set('summary', event.target.value)}
          />
        </div>

        <button
          type="button"
          onClick={onRemove}
          className="flex size-8 shrink-0 items-center justify-center rounded-md text-content-subtle transition-colors hover:bg-surface-danger-subtle hover:text-content-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          <LuTrash2 aria-hidden="true" className="size-4" />
          <span className="sr-only">Remove piece{title === '' ? '' : `: ${title}`}</span>
        </button>
      </div>

      <Gallery images={images} onRemove={detach} />
      <Documents documents={documents} onRemove={detach} />

      <div className="flex flex-wrap gap-3">
        <Attach
          kind="image"
          used={images.length}
          limit={PIECE_LIMITS.images}
          onAdd={attach}
          label="Add images"
        />
        <Attach
          kind="document"
          used={documents.length}
          limit={PIECE_LIMITS.documents}
          onAdd={attach}
          label="Add PDF"
        />
      </div>
    </section>
  );
}

/**
 * The thumbnails, at the size they were uploaded for.
 *
 * `thumbUrl` is the same field whether the file has been saved — where the API
 * resolved it from the stored key — or was chosen a moment ago, where the
 * uploader put an object URL for the copy this tab is holding. Lazy, because a
 * piece may carry twenty of these and most are below the fold.
 */
function Gallery({ images, onRemove }: { images: DraftFile[]; onRemove: (key: string) => void }) {
  if (images.length === 0) return null;

  return (
    <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
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
          className="flex items-center gap-3 rounded-md border border-border-subtle px-3 py-2"
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
 * them out and reports a failure that was really congestion. Going one at a
 * time also means the count on screen is the truth about what has been stored.
 */
function Attach({
  kind,
  used,
  limit,
  onAdd,
  label,
}: {
  kind: 'image' | 'document';
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
      setError(`Only ${room} more ${kind === 'image' ? 'images' : 'documents'} fit on this piece.`);
    }

    const stored: DraftFile[] = [];
    for (const [index, file] of taking.entries()) {
      setBusy({ done: index, total: taking.length });
      const result =
        kind === 'image' ? await uploadPortfolioImage(file) : await uploadPortfolioDocument(file);

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
