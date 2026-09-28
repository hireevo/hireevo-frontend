'use client';

import type { ReactNode } from 'react';
import { LuImages, LuTrash2 } from 'react-icons/lu';
import { TextField } from '@hireevo/ui-web';
import type { DraftFile } from '@/features/media/upload.ts';
import { AddButton } from './add-button.tsx';
import { AttachmentsEditor } from '@/features/media/attachments.tsx';
import { FileDocuments } from '@/features/media/file-gallery.tsx';
import { MediaThumb } from '@/features/media/media-thumb.tsx';
import type { ProfileRecord } from './draft.ts';
import { SectionCard } from './section-card.tsx';

export type PortfolioSectionProps = {
  records: ProfileRecord[];
  onChange: (records: ProfileRecord[]) => void;
  open: boolean;
  action: ReactNode;
  /** The section's own Save, shown under its editor. */
  footer?: ReactNode;
  className?: string;
};

/**
 * The portfolio: pieces of work, each with its own images and documents.
 *
 * It has its own editor rather than the shared record form, which could only
 * add an entry and delete it. That was survivable while a piece was three lines
 * of text; it is not once a piece carries twenty images, because attaching them
 * is something a person does *after* naming the piece, over more than one
 * sitting. So every field here edits in place, and the attaching lives in the
 * shared attachments editor the certifications section uses too.
 */
export function PortfolioSection({
  records,
  onChange,
  open,
  action,
  footer,
  className,
}: PortfolioSectionProps) {
  function update(id: string, change: (record: ProfileRecord) => ProfileRecord) {
    onChange(records.map((record) => (record.id === id ? change(record) : record)));
  }

  return (
    <SectionCard
      title="Portfolio"
      description="Showcase your best work to attract potential clients."
      filled={records.length > 0}
      icon={<LuImages />}
      className={className}
      editing={open}
      action={action}
      {...(footer === undefined ? {} : { footer })}
    >
      {!open ? (
        records.length === 0 ? undefined : (
          <PieceTiles records={records} />
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

/**
 * The closed section: one tile a piece, its own picture, its name across it.
 *
 * The design draws the portfolio as work rather than as a list — a row of
 * covers, each captioned — which is how anyone reads a portfolio and how the
 * published profile shows it too.
 *
 * The documents follow the grid rather than sitting on a tile. A case study is
 * a thing to open, not a thing to look at, and a tile is too small to say which
 * file it is; listing them keeps every attachment reachable from the closed
 * section (§6.7) instead of only from inside the editor.
 */
function PieceTiles({ records }: { records: readonly ProfileRecord[] }) {
  // Only the ones that have been stored: a file chosen a moment ago has no
  // address to open yet, and a row that opens nothing is worse than no row.
  const documents = records.flatMap((record) =>
    (record.files ?? [])
      .filter((file) => file.kind === 'document' && (file.url ?? '') !== '')
      .map((file) => ({
        kind: 'document' as const,
        url: file.url ?? '',
        thumbUrl: file.thumbUrl ?? null,
        objectKey: file.objectKey,
        fileName: file.fileName ?? null,
      })),
  );

  return (
    <div className="flex flex-col gap-3">
      <ul className="grid grid-cols-2 gap-3 *:min-w-0 sm:grid-cols-3 lg:grid-cols-4">
        {records.map((record) => {
          const cover = (record.files ?? []).find((file) => file.kind === 'image');
          const title = record.fields.title ?? '';
          const summary = record.fields.summary ?? '';

          return (
            <li
              key={record.id}
              className="relative overflow-hidden rounded-lg border border-border-subtle bg-surface-muted"
            >
              <span className="flex aspect-[4/3] w-full">
                {/* The caption already names the piece, so a tile with no
                    cover says it has none rather than repeating the name. */}
                <MediaThumb
                  src={cover?.thumbUrl ?? null}
                  alt={title}
                  fallback={
                    <span className="flex size-full items-center justify-center bg-surface-muted">
                      <LuImages aria-hidden="true" className="size-6 text-content-subtle" />
                      <span className="sr-only">No picture yet</span>
                    </span>
                  }
                />
              </span>
              {title === '' && summary === '' ? null : (
                <span className="absolute inset-x-0 bottom-0 bg-linear-to-t from-surface-inverse/85 to-transparent px-3 pt-8 pb-2.5">
                  <span className="block truncate text-sm font-semibold text-content-inverse">
                    {title}
                  </span>
                  {summary === '' ? null : (
                    <span className="block truncate text-xs text-content-inverse/85">
                      {summary}
                    </span>
                  )}
                </span>
              )}
            </li>
          );
        })}
      </ul>

      <FileDocuments files={documents} fallbackName="Document" />
    </div>
  );
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

  const set = (name: string, value: string) =>
    onChange((current) => ({ ...current, fields: { ...current.fields, [name]: value } }));

  const setFiles = (next: DraftFile[]) => onChange((current) => ({ ...current, files: next }));

  const title = record.fields.title ?? '';

  return (
    // `min-w-0` throughout: a grid or flex item defaults to `min-width: auto`,
    // which refuses to shrink below its content. Firefox holds that line where
    // Chromium does not, so at 320px the fields kept their intrinsic width and
    // pushed the whole page into a sideways scroll (§6.11).
    <section className="flex min-w-0 flex-col gap-4 rounded-lg border border-border-subtle p-4">
      {/* The remove control gets its own row rather than sharing one with the
          fields. Beside them it collided with the Title label at 320px — the
          two-column grid collapses to one there and the label runs the full
          width, straight under the button (§6.11). */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onRemove}
          className="flex size-8 items-center justify-center rounded-md text-content-subtle transition-colors hover:bg-surface-danger-subtle hover:text-content-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          <LuTrash2 aria-hidden="true" className="size-4" />
          <span className="sr-only">Remove piece{title === '' ? '' : `: ${title}`}</span>
        </button>
      </div>

      <div className="grid gap-4 *:min-w-0 sm:grid-cols-2">
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

      <AttachmentsEditor files={files} group="portfolio" onChange={setFiles} />
    </section>
  );
}
