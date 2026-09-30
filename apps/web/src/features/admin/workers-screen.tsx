'use client';

import { useEffect, useId, useRef, useState } from 'react';
import {
  LuChevronLeft,
  LuChevronRight,
  LuSearch,
  LuTriangleAlert,
  LuUserSearch,
  LuX,
} from 'react-icons/lu';
import { Badge, Button, Dialog, cn } from '@hireevo/ui-web';
import { NO_FILTERS, withCountry, type WorkerFilters } from './filter-workers.ts';
import { RowMenu } from './row-menu.tsx';
import type { AdminWorker } from './types.ts';

const CONTROL =
  'h-11 w-full rounded-lg border border-border-subtle bg-surface px-3 text-sm text-content transition-colors focus:border-border-accent focus:outline-2 focus:-outline-offset-2 focus:outline-focus disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-content-subtle';

/**
 * The workers list an administrator works in.
 *
 * Filtering happens as the panel is used rather than only when Search is
 * pressed — the rows are here, so making somebody press a button to see the
 * effect of the thing they just typed is a round trip invented for its own
 * sake. Search stays, because a form with a text field has to do something on
 * Enter, and Reset is the way back to everything.
 */
export interface WorkersScreenProps {
  workers: readonly AdminWorker[];
  /** How many match the current filters, across every page. */
  total: number;
  page: number;
  pageSize: number;
  /** The countries and regions there are to filter by. */
  places: readonly { country: string; regions: readonly string[] }[];
  /** True while a ban or an unban is in flight, so the menus stop taking presses. */
  busy: boolean;
  /** Something the last request said, shown above the list. */
  problem: string | null;
  /** The reader asked for a different search, place or page. */
  onQuery: (filters: WorkerFilters, page: number) => void;
  onBan: (worker: AdminWorker) => void;
  onUnban: (worker: AdminWorker) => void;
  /** Said out loud after an act — what happened, for anyone not watching a chip. */
  said?: string;
  /** Shown where the API cannot keep what this screen does, as the preview cannot. */
  notice?: string;
}

/**
 * The workers list an administrator works in.
 *
 * It draws and it asks; it decides nothing. Which rows exist, what a search
 * matches and what a ban does are all somewhere else — the API behind
 * `workers-page.tsx`, or the fixture behind `workers-preview.tsx` — which is
 * what let this screen be built, swept and reviewed before the endpoints
 * existed, and what keeps `/design-system/admin` renderable with no server.
 *
 * The search narrows as it is typed, after a pause: a request per keystroke is
 * five requests for a five-letter name, and the last one is the only answer
 * anybody waits for. The magnifier asks at once, for somebody who would rather
 * press than wait.
 */
export function WorkersScreen({
  workers,
  total,
  page,
  pageSize,
  places,
  busy,
  problem,
  onQuery,
  onBan,
  onUnban,
  said = '',
  notice,
}: WorkersScreenProps) {
  const [filters, setFilters] = useState<WorkerFilters>(NO_FILTERS);
  const [shown, setShown] = useState<AdminWorker | null>(null);
  const [asking, setAsking] = useState<AdminWorker | null>(null);
  const search = useRef<HTMLInputElement>(null);
  const waiting = useRef<ReturnType<typeof setTimeout> | null>(null);
  // An explicit label rather than one wrapped around the field: the search and
  // clear buttons live in the same box, and a `label` that wraps several
  // controls names the first one it finds — which would be the button, leaving
  // the field somebody types into with no name at all.
  const nameId = useId();

  /** A place or a page is asked for at once; a name waits for the typing to stop. */
  const ask = (next: WorkerFilters, nextPage: number, delay = 0) => {
    setFilters(next);
    if (waiting.current !== null) clearTimeout(waiting.current);
    if (delay === 0) {
      onQuery(next, nextPage);
      return;
    }
    waiting.current = setTimeout(() => onQuery(next, nextPage), delay);
  };

  useEffect(
    () => () => {
      if (waiting.current !== null) clearTimeout(waiting.current);
    },
    [],
  );

  const countries = places.map((place) => place.country);
  const regions = places.find((place) => place.country === filters.country)?.regions ?? [];
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);
  const filtered = filters.name !== '' || filters.country !== '' || filters.state !== '';

  return (
    <div className="flex flex-col gap-5">
      {notice === undefined ? null : (
        <p
          role="status"
          className="flex items-start gap-2.5 rounded-xl bg-surface-warning-subtle px-4 py-3 text-sm text-content-warning"
        >
          <LuTriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>{notice}</span>
        </p>
      )}

      {problem === null ? null : (
        <p
          role="alert"
          className="flex items-start gap-2.5 rounded-xl bg-surface-danger-subtle px-4 py-3 text-sm text-content-danger"
        >
          <LuTriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>{problem}</span>
        </p>
      )}

      {/* What just happened, for a screen reader: a chip changing colour in a
          row somebody cannot see is not an answer. */}
      <p aria-live="polite" className="sr-only">
        {said}
      </p>

      <section
        aria-label="Search workers"
        className="rounded-2xl border border-border-subtle bg-surface p-4 sm:p-5"
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            ask(filters, 1);
          }}
          className="grid gap-4 *:min-w-0 md:grid-cols-3"
        >
          <div className="flex flex-col gap-1.5">
            <label htmlFor={nameId} className="text-sm font-medium text-content-muted">
              Worker name
            </label>
            {/* One bordered box with three things side by side rather than a
                field with icons floating on top of it: overlapping controls are
                what the resolution sweep measures as a fault, and a button
                sitting on an input is also a button whose press area is the
                input's. The box takes the focus ring, so it still reads as one
                field. */}
            <span
              className={cn(
                'flex h-11 w-full items-center gap-1 rounded-lg border border-border-subtle bg-surface pr-1 pl-1',
                'transition-colors focus-within:border-border-accent focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-focus',
              )}
            >
              <button
                type="submit"
                className="flex size-9 shrink-0 items-center justify-center rounded-md text-content-subtle transition-colors hover:bg-surface-subtle hover:text-content focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
              >
                <LuSearch aria-hidden="true" className="size-4" />
                <span className="sr-only">Search</span>
              </button>

              <input
                ref={search}
                id={nameId}
                type="text"
                value={filters.name}
                placeholder="Search by name or email"
                onChange={(event) => ask({ ...filters, name: event.target.value }, 1, 300)}
                className="h-full min-w-0 flex-1 bg-transparent text-sm text-content outline-none"
              />

              {/* Only while there is something to cancel: a cross beside an
                  empty field is a control that does nothing (§6.7). */}
              {filters.name === '' ? null : (
                <button
                  type="button"
                  onClick={() => {
                    ask({ ...filters, name: '' }, 1);
                    search.current?.focus();
                  }}
                  className="flex size-9 shrink-0 items-center justify-center rounded-md text-content-subtle transition-colors hover:bg-surface-subtle hover:text-content focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
                >
                  <LuX aria-hidden="true" className="size-4" />
                  <span className="sr-only">Clear the search</span>
                </button>
              )}
            </span>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-content-muted">Country</span>
            <select
              value={filters.country}
              onChange={(event) => ask(withCountry(filters, event.target.value), 1)}
              className={CONTROL}
            >
              <option value="">Every country</option>
              {countries.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-content-muted">State</span>
            <select
              value={filters.state}
              disabled={filters.country === ''}
              onChange={(event) => ask({ ...filters, state: event.target.value }, 1)}
              className={CONTROL}
            >
              <option value="">
                {filters.country === '' ? 'Choose a country first' : 'Every state'}
              </option>
              {regions.map((region) => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
            </select>
          </label>

          <div className="flex flex-wrap items-center gap-3 md:col-span-3">
            <p aria-live="polite" className="text-sm text-content-muted">
              {total === 0
                ? 'No workers match this search'
                : `Showing ${first}–${last} of ${total}`}
            </p>
            {/* Only while something is set: the cross in the field clears the
                name, and this is the way back from a country and a state as
                well. A permanent Reset beside an untouched panel is a button
                that does nothing. */}
            {filtered ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => ask(NO_FILTERS, 1)}
              >
                Clear filters
              </Button>
            ) : null}
          </div>
        </form>
      </section>

      <section
        aria-label="Workers"
        className="overflow-hidden rounded-2xl border border-border-subtle bg-surface"
      >
        {workers.length === 0 ? (
          <EmptyState onReset={() => ask(NO_FILTERS, 1)} />
        ) : (
          <>
            <WorkerTable
              rows={workers}
              busy={busy}
              onOpen={setShown}
              onAsk={setAsking}
              onUnban={onUnban}
            />
            <WorkerCards
              rows={workers}
              busy={busy}
              onOpen={setShown}
              onAsk={setAsking}
              onUnban={onUnban}
            />
          </>
        )}
      </section>

      {pages > 1 ? (
        <nav aria-label="Pages" className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-content-muted">
            Page {page} of {pages}
          </p>
          <span className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={page === 1}
              onClick={() => ask(filters, page - 1)}
            >
              <LuChevronLeft aria-hidden="true" className="size-4" />
              Previous
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={page === pages}
              onClick={() => ask(filters, page + 1)}
            >
              Next
              <LuChevronRight aria-hidden="true" className="size-4" />
            </Button>
          </span>
        </nav>
      ) : null}

      {shown === null ? null : (
        <WorkerDetails
          worker={shown}
          onClose={() => setShown(null)}
          onAsk={setAsking}
          onUnban={onUnban}
        />
      )}

      {asking === null ? null : (
        <ConfirmBan
          worker={asking}
          onClose={() => setAsking(null)}
          onConfirm={() => {
            onBan(asking);
            setAsking(null);
          }}
        />
      )}
    </div>
  );
}

/** Both statuses as words first: nothing here depends on seeing a colour. */
function StatusBadge({ worker }: { worker: AdminWorker }) {
  return worker.status === 'completed' ? (
    <Badge tone="success">Profile complete</Badge>
  ) : (
    <Badge tone="warning">Profile incomplete</Badge>
  );
}

function AccountBadge({ worker }: { worker: AdminWorker }) {
  return worker.account === 'banned' ? (
    <Badge tone="warning" variant="solid">
      Flagged
    </Badge>
  ) : (
    <Badge tone="neutral">Unflagged</Badge>
  );
}

/**
 * Everything one row can be told to do, behind the three dots.
 *
 * The row already says who this is, where they are and how their account
 * stands, so a pair of buttons on every line is a second reading of the same
 * thing. The dots are the screen this replaces, kept: actions stay out of the
 * way until somebody wants one.
 *
 * Banning asks first and unbanning does not. Closing somebody's account is the
 * half that cannot be undone by the person it happened to, and the half an
 * administrator does on the row above the one they meant. Letting them back in
 * is the undo, so a second step there would be friction with nothing behind it.
 */
function WorkerActions({
  worker,
  busy,
  onOpen,
  onAsk,
  onUnban,
}: {
  worker: AdminWorker;
  /** True while another act is in flight — pressing again would race it. */
  busy: boolean;
  onOpen: (worker: AdminWorker) => void;
  onAsk: (worker: AdminWorker) => void;
  onUnban: (worker: AdminWorker) => void;
}) {
  return (
    <RowMenu
      label={worker.name}
      busy={busy}
      items={[
        { label: 'View details', onChoose: () => onOpen(worker) },
        worker.account === 'banned'
          ? { label: 'Unban user', onChoose: () => onUnban(worker) }
          : { label: 'Ban user', onChoose: () => onAsk(worker), danger: true },
      ]}
    />
  );
}

/**
 * The table, from the medium breakpoint up.
 *
 * A real `table`, so a screen reader announces which column a cell is in and
 * the header row is read once rather than repeated into every line. Below `xl`
 * it is hidden and the cards below take over: a six-column table on anything
 * narrower either scrolls the page sideways or shrinks its text under twelve
 * pixels, and §6.11 rules out both.
 */
function WorkerTable({
  rows,
  busy,
  onOpen,
  onAsk,
  onUnban,
}: {
  rows: readonly AdminWorker[];
  busy: boolean;
  onOpen: (worker: AdminWorker) => void;
  onAsk: (worker: AdminWorker) => void;
  onUnban: (worker: AdminWorker) => void;
}) {
  return (
    // `xl`, not `md`: six columns with two lines of text in several of them
    // need about a thousand pixels, and the sidebar takes 256 of whatever the
    // window has from `lg` up. At 768 and at 1024 the table pushed the whole
    // page into a sideways scroll with the Details column off the edge. The
    // horizontal scroll here is the second line of defence, for a name longer
    // than any of these.
    <div className="hidden overflow-x-auto xl:block">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-border-subtle bg-surface-subtle">
            <th scope="col" className="px-4 py-3 font-semibold text-content-muted">
              Worker
            </th>
            <th scope="col" className="px-4 py-3 font-semibold text-content-muted">
              Location
            </th>
            <th scope="col" className="px-4 py-3 font-semibold text-content-muted">
              Profile
            </th>
            <th scope="col" className="px-4 py-3 font-semibold text-content-muted">
              Flagged
            </th>
            <th scope="col" className="px-4 py-3 text-right font-semibold text-content-muted">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((worker) => (
            <tr
              key={worker.id}
              className="border-b border-border-subtle last:border-0 hover:bg-surface-subtle"
            >
              <td className="max-w-[20rem] px-4 py-3 align-top">
                <span className="block truncate font-medium text-content-accent">
                  {worker.name}
                </span>
                <span className="block truncate text-xs text-content-subtle">{worker.email}</span>
              </td>
              <td className="px-4 py-3 align-top text-content-muted">
                <span className="block">{worker.country}</span>
                <span className="block text-xs text-content-subtle">{worker.state ?? '—'}</span>
              </td>
              <td className="px-4 py-3 align-top">
                <StatusBadge worker={worker} />
              </td>
              <td className="px-4 py-3 align-top">
                <AccountBadge worker={worker} />
              </td>
              <td className="px-4 py-3 text-right align-top">
                <WorkerActions
                  worker={worker}
                  busy={busy}
                  onOpen={onOpen}
                  onAsk={onAsk}
                  onUnban={onUnban}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** The same rows as cards, which is what a phone gets instead of a wide table. */
function WorkerCards({
  rows,
  busy,
  onOpen,
  onAsk,
  onUnban,
}: {
  rows: readonly AdminWorker[];
  busy: boolean;
  onOpen: (worker: AdminWorker) => void;
  onAsk: (worker: AdminWorker) => void;
  onUnban: (worker: AdminWorker) => void;
}) {
  return (
    <ul className="flex flex-col divide-y divide-border-subtle xl:hidden">
      {rows.map((worker) => (
        <li key={worker.id} className="flex flex-col gap-3 p-4">
          <div className="flex min-w-0 items-start justify-between gap-3">
            <span className="min-w-0">
              <span className="block truncate font-semibold text-content-accent">
                {worker.name}
              </span>
              <span className="block truncate text-xs text-content-subtle">{worker.email}</span>
            </span>
            <WorkerActions
              worker={worker}
              busy={busy}
              onOpen={onOpen}
              onAsk={onAsk}
              onUnban={onUnban}
            />
          </div>
          <p className="text-sm text-content-muted">
            {worker.state === null ? worker.country : `${worker.state}, ${worker.country}`}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge worker={worker} />
            <AccountBadge worker={worker} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * What a search that matched nothing says.
 *
 * With the way out in it: the reader's own filters are the reason the table is
 * empty, and an empty table with no explanation reads as a broken page.
 */
function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-surface-subtle">
        <LuUserSearch aria-hidden="true" className="size-5 text-content-subtle" />
      </span>
      <p className="text-base font-semibold text-content-accent">No workers match this search</p>
      <p className="max-w-sm text-sm text-content-muted">
        Try a shorter name, or clear the filters to see everybody again.
      </p>
      <Button type="button" variant="secondary" size="sm" onClick={onReset}>
        Clear filters
      </Button>
    </div>
  );
}

/** One worker in full, in the box the Details button opens. */
function WorkerDetails({
  worker,
  onClose,
  onAsk,
  onUnban,
}: {
  worker: AdminWorker;
  onClose: () => void;
  onAsk: (worker: AdminWorker) => void;
  onUnban: (worker: AdminWorker) => void;
}) {
  const rows: [string, string][] = [
    ['Worker ID', worker.id],
    ['Email', worker.email],
    ['Country', worker.country],
    ['State', worker.state ?? 'None recorded'],
    ['Joined', worker.joinedOn],
  ];

  return (
    <Dialog
      title={worker.name}
      description="Everything recorded about this account."
      onClose={onClose}
    >
      <dl className="flex flex-col divide-y divide-border-subtle">
        {rows.map(([term, value]) => (
          <div
            key={term}
            className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-2.5"
          >
            <dt className="text-sm text-content-subtle">{term}</dt>
            <dd className="min-w-0 text-sm break-words text-content">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <StatusBadge worker={worker} />
        <AccountBadge worker={worker} />
      </div>

      {/* The same action as the row's, so somebody who opened the record to
          decide does not have to close it again to act. */}
      <div className="mt-5 flex justify-end">
        {worker.account === 'banned' ? (
          <Button type="button" variant="secondary" size="md" onClick={() => onUnban(worker)}>
            Unban user
          </Button>
        ) : (
          <Button
            type="button"
            variant="secondary"
            size="md"
            className="text-content-danger hover:bg-surface-danger-subtle"
            onClick={() => onAsk(worker)}
          >
            Ban user
          </Button>
        )}
      </div>
    </Dialog>
  );
}

/**
 * The question asked before an account is closed.
 *
 * It names the person and says what happens to them, because the row an
 * administrator meant to press and the row they did press are one line apart,
 * and "Are you sure?" answers neither question.
 */
function ConfirmBan({
  worker,
  onClose,
  onConfirm,
}: {
  worker: AdminWorker;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog title={`Ban ${worker.name}?`} onClose={onClose}>
      <p className="text-sm leading-[1.7] text-content-muted">
        They will not be able to sign in, and their profile stops being visible to employers.
        Nothing is deleted, and you can let them back in at any time.
      </p>
      <p className="mt-2 text-sm text-content-subtle">{worker.email}</p>

      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <Button type="button" variant="secondary" size="md" onClick={onClose}>
          Cancel
        </Button>
        <Button type="button" variant="danger" size="md" onClick={onConfirm}>
          Ban {worker.name.split(' ')[0]}
        </Button>
      </div>
    </Dialog>
  );
}
