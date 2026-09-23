'use client';

import type { ReactNode } from 'react';
import { LuImages, LuTrash2 } from 'react-icons/lu';
import { TextField } from '@hireevo/ui-web';
import type { DraftFile } from '@/features/media/upload.ts';
import { AddButton } from './add-button.tsx';
import { AttachmentsEditor, FileThumbnails, documentCount } from '@/features/media/attachments.tsx';
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
 * sitting. So every field here edits in place, and the attaching lives in the
 * shared attachments editor the certifications section uses too.
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
      filled={records.length > 0}
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
              media: <FileThumbnails files={record.files ?? []} />,
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

/**
 * What a closed section says about a piece: its link, and any documents.
 *
 * Images are not counted here — the closed piece shows their previews (see
 * FileThumbnails), which say more than "1 image" ever could. Documents have no
 * preview, so they are still named.
 */
function describe(record: ProfileRecord): string {
  const documents = documentCount(record.files ?? []);

  const parts = [
    record.fields.url ?? '',
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
